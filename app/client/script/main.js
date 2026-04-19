import { shuffle, attemptIsRepeat, attemptIsCorrect, attemptIsOneAway, softHypenateText, getCategoryData } from "./utils.js";
import { getRowWordElements, createCardElement, cardFX, popup, sortCardEls, createCategoryElements } from "./cards.js";
import * as Discord from "./discord.js";

const API_ENDPOINT = window.origin + "/api";
let discordSdk = null;
let userData = null;
let selectedWords = 0;
let categories = null;
let categoryIds = null;
let submitBtn = null;
let shuffleBtn = null;
let deselectBtn = null;
let prevOrder = null;
let currOrder = null;
let orderWasUpdated = true;
const oldAttempts = [];
const categoryEls = [];
const wordEls = [];

async function recordAttempt (attempt) { // attempt is expected to be a Set of 4 Numbers
    try {
        const bodyData = {attempt: [...attempt]};
        if (orderWasUpdated)
            bodyData.order = currOrder;
        const resp = await fetch(API_ENDPOINT + "/record-attempt?id=" + userData?.id, {
            method: "POST",
            body: JSON.stringify(bodyData)
        });
        return resp.ok ? true : undefined;
    } catch (err) {
        console.error(err);
        return undefined;
    }
}

async function recordOrder (wordIds) { // wordIds is expected to be an Array of 16 Numbers
    try {
        const resp = await fetch(API_ENDPOINT + "/record-order?id=" + userData?.id, {
            method: "POST",
            body: JSON.stringify({order: wordIds})
        });
        return resp.ok ? true : undefined;
    } catch (err) {
        console.error(err);
        return undefined;
    }
}

// returns a Promise. Instantly resolves to false if attempt is a repeat
function submitAttempt () { // old attempts returned from api as an Array of 4-Number Arrays (2D).
    const selectedWordEls = [...document.getElementsByClassName("selected")];
    if (selectedWordEls.length != 4) {
        console.error(`Something went wrong while submitting! ${selectedWordEls.length} words selected - 4 required`);
        return;
    }
    const wordIds = Array.from(selectedWordEls, (wordEl) => parseInt(wordEl.dataset.id)).sort();
    selectedWordEls.forEach((wordEl) => wordEl.classList.remove("selected"));
    selectedWords = 0;
    // attempts within oldAttempts should already be sorted
    if (attemptIsRepeat(wordIds, oldAttempts)) {
        console.debug("Repeated attempt");
        return cardFX.repeatAttempt(selectedWordEls)
            .then(() => popup("Already guessed!", 2000))
            .then(() => false);
    } else {
        // jesus, how readable is this for others?
        return (attemptIsCorrect(wordIds, categoryIds)
            ? (console.debug("Correct attempt"), playCorrectAttemptAnimation(getCategoryElement(wordIds), selectedWordEls, document.getElementById("words"), document.getElementById("categories")))
            : (
                attemptIsOneAway(wordIds, categoryIds)
                    ? (console.debug("Close attempt"), popup("One away...", 2000))
                    : console.debug("Incorrect attempt"),
                cardFX.incorrect(selectedWordEls)))
            .then(() => recordAttempt(new Set(wordIds)))
            .then(success => {
                if (success) {
                    oldAttempts.push(wordIds);
                    return true;
                } else {
                    // something went wrong in backend
                    return undefined;
                }
            });
    }
}

function selectWord(wordEl) {
    if (wordEl.classList.contains("selected")) {
        selectedWords--;
        wordEl.classList.remove("selected");
    } else if (selectedWords < 4) { // [!] this should be 3, but I can't fucking count I guess
        selectedWords++;
        wordEl.classList.add("selected");
    }
}

function wordClickHandler (e) {
    // console.info(`clicked ${e.target?.innerHTML}`);
    selectWord(e.target);
    if (selectedWords < 4)
        submitBtn.classList.add("disabled");
    else
        submitBtn.classList.remove("disabled");
    if (selectedWords > 0)
        deselectBtn.classList.remove("disabled");
    else
        deselectBtn.classList.add("disabled");
}

function shuffleHandler (e) {
    const unsolvedIds = getUnsolvedWordIds(wordEls);
    if (!unsolvedIds.length) return;
    console.debug("Shuffling...");
    prevOrder = currOrder;
    currOrder = [...prevOrder.slice(0, unsolvedIds.length), ...shuffle(unsolvedIds)];
    orderWasUpdated = true;
    cardFX.shuffle(wordEls, currOrder); // [!] inefficient, may not need to pass the entire current order- laziness
}

function deselectHandler (e) {

}

function submitHandler (e) {
    if (selectedWords >= 3) {
        console.debug("Submitting...");
        submitAttempt().then(res =>
            console.debug(res));
    } else {
        console.debug(`Failed to submit. Wordcount: ${selectedWords}`);
    }
}

function playCorrectAttemptAnimation (categoryEl, wordEls, wordContainer, categoryContainer) {
    const sortedWordEls = wordEls.toSorted((a, b) => parseInt(a.dataset.id) - parseInt(b.dataset.id));
    const topRowWordEls = wordEls.filter(wordEl => wordEl.style.order < 4).sort((a, b) => a.style.order - b.style.order);
    return Promise.all(Array.from(sortedWordEls, (wordEl, idx) =>
        cardFX.swapElements(wordEl, topRowWordEls[idx])))
    .then(() => 
        cardFX.fadeInCategory(categoryEl, categoryContainer, wordContainer));
}

function getCategoryElement (attempt) { // attempt is an Array of Numbers
    const categoryEl = categoryEls.filter(categoryEl =>
        categoryEl.innerHTML == getCategoryData(attempt, categories));
    return (categoryEl.length) ? categoryEl[0] : undefined;
}

// [!] inefficient method- laziness
function getUnsolvedWordIds (cardEls) {
    return Array.from(cardEls.filter(e => !e.classList.contains("hide")), e => parseInt(e?.dataset?.id));
}

window.onunload = (e) => {
    if (orderWasUpdated)
        recordOrder(currOrder);
}

window.onload = (e) => {
    const containerEl = document.getElementById("content-container");
    const wordGridEl = document.getElementById("words");
    const menuEl = document.getElementById("buttons");
    const categoryStackEl = document.getElementById("categories");
    Promise.all([
        // retreive categories
        fetch(API_ENDPOINT + "/get-gamedata")
            .then(resp => {
                if (resp.ok) {
                    return resp.json();
                } else {
                    console.error("Failed to contact gamedata API endpoint"); // [!] add UI notification for this
                }
            }).then(data => {
                if (data) {
                    categories = data;
                    categoryIds = Array.from(Object.values(categories), wordData =>
                        Array.from(wordData, ({id}) => id).sort());
                }
            }),
        // connect to discord actvity sdk
        Discord.getClient(API_ENDPOINT + "/discord-auth")
            .then(client_id =>
                Discord.initSdk(client_id, API_ENDPOINT + "/discord-auth"))
            .then(({discordSdk: sdk, user})=> {
                discordSdk = sdk;
                userData = user;
                return fetch(
                        `${API_ENDPOINT}/get-userdata?id=${userData?.id}`
                    ).then(resp => {
                        if (resp.ok) {
                            return resp.json();
                        } else {
                            console.error("Failed to contact userdata API endpoint"); // [!] add UI notification for this
                        }
                    }).then(({ attempts, order }) => {
                        prevOrder = order;
                        if (attempts)
                            oldAttempts.push(...Array.from(attempts, attempt => attempt.toSorted()));
                        if (order)
                            orderWasUpdated = false;
                    })
            })        
    ]).then((_) => {
            console.debug(`Loaded previous attempts: ${oldAttempts}`);
            console.log(categories);

            // create card elements
            {
                const omittedWordIds = [];
                createCategoryElements(Object.keys(categories))
                    .forEach(categoryEl => categoryEls.push(categoryEl));

                // init previous correct attempts (if any)
                if (oldAttempts.length) {
                    oldAttempts.filter(attempt => attemptIsCorrect(attempt, categoryIds))
                        .forEach(correctAttempt => {
                            const categoryEl = getCategoryElement(correctAttempt);
                            if (categoryEl !== undefined) {
                                // add word id to blacklist
                                omittedWordIds.push(...correctAttempt);
                                // display the category
                                const ogTransDuration = getComputedStyle(categoryEl)?.getPropertyValue("--transition-duration");
                                categoryEl.style.setProperty("--transition-duration", "0");
                                categoryStackEl.appendChild(categoryEl);
                                categoryEl.style.setProperty("--transition-duration", ogTransDuration);
                            } else {
                                console.warn(`Failed to find a matching category with word IDs: ${correctAttempt}`)
                            }
                        });
                }
                const wordIds = [];
                Object.entries(categories).forEach(([_, words]) => {
                    words.forEach(({word, id}) => {
                        let wordEl = createCardElement(softHypenateText(word, 5), wordClickHandler, "word");
                        wordEl.dataset.id = id;
                        if (omittedWordIds.includes(id))
                            wordEl.classList.add("hide");
                        wordEls.push(wordEl);
                        wordIds.push(id);
                    });
                });
                currOrder = orderWasUpdated ? shuffle(wordIds) : prevOrder;
                sortCardEls(wordEls, currOrder);
                wordEls.forEach(wordEl => wordGridEl.append(wordEl));
            }

            // main runtime
            {
                // let biggestWordEl = wordEls.reduce((biggestWordEl, wordEl) => biggestWordEl.offsetWidth > wordEl.offsetWidth ? biggestWordEl : wordEl);
                // biggestWordEl.dataset.largest = "true";
                // biggestWordEl.style.setProperty("--card-width", "min-content");
                // resizeCardHandler();
            }
            {
                const avatarSize = 128;
                const avatarUrl = Discord.AVATAR_URL(userData.id, userData.avatar, avatarSize);
                const avatarEl = document.createElement("img");
                avatarEl.classList.add("icon");
                avatarEl.src = avatarUrl;
                avatarEl.width = avatarSize;
                avatarEl.height = avatarSize;
                containerEl.prepend(avatarEl);
            }
            // create buttons
            {
                submitBtn = document.createElement("div");
                submitBtn.classList.add("pill", "disabled");
                submitBtn.id = "submit";
                submitBtn.onclick = submitHandler;
                submitBtn.innerHTML = "submit";
                menuEl.append(submitBtn);
                deselectBtn = document.createElement("div");
                deselectBtn.classList.add("pill", "disabled");
                deselectBtn.id = "deselect";
                deselectBtn.onclick = deselectHandler;
                deselectBtn.innerHTML = "deselect all";
                menuEl.append(deselectBtn);
                shuffleBtn = document.createElement("div");
                shuffleBtn.classList.add("pill");
                shuffleBtn.id = "shuffle";
                shuffleBtn.onclick = shuffleHandler;
                shuffleBtn.innerHTML = "shuffle";
                menuEl.append(shuffleBtn);
            }
        });
}
