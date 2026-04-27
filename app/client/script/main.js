import { shuffle, attemptIsRepeat, attemptIsCorrect, attemptIsOneAway, softHypenateText, getCategoryData, isOverflown } from "./utils.js";
import { createCardElement, cardFX, popup, sortCardEls, createCategoryElements } from "./cards.js";
import * as Discord from "./discord.js";

const API_ENDPOINT = window.origin + "/api";
let discordSdk = null;
let userData = null;
let newAttemptMade = false;

const GAMEDATA = {categories: null, challenge: 0, ids: null};
const ATTEMPTS = [];
const ELEMENTS = {
    WORDS: [],
    CATEGORIES: [],
    WORD_GRID: null,
    CATEGORY_GRID: null,
    MENU: null,
    ATTEMPT_COUNTER: null,
    selectedCount: 0,
    get SELECTED () {
        return [...document.getElementsByClassName("selected")];
    }
};
const ORDER = {
    PREV: null,
    CURR: null,
    get wasUpdated () {
        return Array.isArray(ORDER.PREV) != Array.isArray(ORDER.CURR) || ORDER.PREV?.some((val, idx) => val != ORDER.CURR?.[idx]);
    }
};
const BUTTONS = {
    SHUFFLE: null,
    SUBMIT: null,
    DESELECT: null
};

async function recordAttempt (attempt) { // attempt is expected to be a Set of 4 Numbers
    try {
        const bodyData = {attempt: [...attempt]};
        if (ORDER.wasUpdated)
            bodyData.order = ORDER.CURR;
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

async function queueRecordOrder (wordIds) { // intended for use when page is navigated away from
    return await fetch(API_ENDPOINT + "/record-order?id=" + userData?.id, {
        method: "POST",
        keepalive: true,
        body: JSON.stringify({order: wordIds})
    });
}

// returns a Promise. Instantly resolves to false if attempt is a repeat
async function submitAttempt () { // old attempts returned from api as an Array of 4-Number Arrays (2D).
    const selectedWordEls = ELEMENTS.SELECTED;
    if (selectedWordEls.length != 4) {
        console.error(`Something went wrong while submitting! ${selectedWordEls.length} words selected - 4 required`);
        return false;
    }
    const wordIds = Array.from(selectedWordEls, (wordEl) => parseInt(wordEl.dataset.id)).sort();
    selectedWordEls.forEach((wordEl) => wordEl.classList.remove("selected"));
    ELEMENTS.selectedCount = 0;
    BUTTONS.DESELECT.classList.add("disabled");
    BUTTONS.SUBMIT.classList.add("disabled");
    // attempts within ATTEMPTS should already be sorted
    let animationPromise = cardFX.submit(selectedWordEls);
    if (attemptIsRepeat(wordIds, ATTEMPTS)) {
        console.debug("Repeated attempt");
        animationPromise = animationPromise
        .then(() => Promise.all([
            cardFX.repeatAttempt(selectedWordEls),
            popup("Already guessed!", 2000)
        ]));
    } else if (attemptIsCorrect(wordIds, GAMEDATA.ids)) {
        console.debug("Correct attempt");
        animationPromise = animationPromise
            .then(() => playCorrectAttemptAnimation(
                getCategoryElement(wordIds),
                selectedWordEls,
                document.getElementById("words"),
                document.getElementById("categories")
            )).then(() => { queueRecordOrder(ORDER.CURR) });
    } else if (attemptIsOneAway(wordIds, GAMEDATA.ids)) {
        console.debug("Close attempt");
        animationPromise = animationPromise
            .then(() => popup("One away...", 2000));
    } else {
        console.debug("Incorrect attempt");
        animationPromise = animationPromise
            .then(() => cardFX.incorrect(selectedWordEls));
    }
    try {
        if (await recordAttempt(new Set(wordIds))) {
            ATTEMPTS.push(wordIds);
            newAttemptMade = true;
            updateAttemptCounter();
            await animationPromise;
            return true;
        }
    } catch (error) {
        console.error(error);
        await popup("A client error occurred.");
    }
    await animationPromise;
    return false;
}


function selectWord(wordEl) {
    if (wordEl.classList.contains("selected")) {
        ELEMENTS.selectedCount--;
        wordEl.classList.remove("selected");
    } else if (ELEMENTS.selectedCount < 4) { // [!] this should be 3, but I can't fucking count I guess
        ELEMENTS.selectedCount++;
        wordEl.classList.add("selected");
    }
}

function wordClickHandler (e) {
    // console.info(`clicked ${e.target?.innerHTML}`);
    selectWord(e.target);
    if (ELEMENTS.selectedCount < 4)
        BUTTONS.SUBMIT.classList.add("disabled");
    else
        BUTTONS.SUBMIT.classList.remove("disabled");
    if (ELEMENTS.selectedCount > 0)
        BUTTONS.DESELECT.classList.remove("disabled");
    else
        BUTTONS.DESELECT.classList.add("disabled");
}

function shuffleHandler (e) {
    const unsolvedIds = getUnsolvedWordIds(ELEMENTS.WORDS);
    if (!unsolvedIds.length) return;
    BUTTONS.SHUFFLE.classList.add("disabled");
    console.debug("Shuffling...");
    ORDER.PREV = ORDER.CURR;
    ORDER.CURR = [...ORDER.PREV.slice(0, ELEMENTS.WORDS.length - unsolvedIds.length), ...shuffle(unsolvedIds)];
    cardFX.shuffle(ELEMENTS.WORDS, ORDER.CURR) // [!] inefficient, may not need to pass the entire current order- laziness
        .finally(() => BUTTONS.SHUFFLE.classList.remove("disabled"));
}

function deselectHandler (e) {
    const selectedWordEls = ELEMENTS.SELECTED;
    ELEMENTS.selectedCount = 0;
    selectedWordEls.forEach((wordEl) => wordEl.classList.remove("selected"));
    BUTTONS.DESELECT.classList.add("disabled");
}

function submitHandler (e) {
    if (ELEMENTS.selectedCount >= 3) {
        console.debug("Submitting...");
        submitAttempt()
            .then((success) => {
                if (!success)
                    console.warn("Submission failed, attempt not recorded.");
            })
            .then(() => {
                if (ELEMENTS.CATEGORY_GRID.children.length != 4) {
                    // generateCard(); // [!] testing
                    return;
                }
                return setWinScreen();
            });
    } else {
        console.debug(`Failed to submit. Wordcount: ${ELEMENTS.selectedCount}`);
    }
}

function playCorrectAttemptAnimation (categoryEl, wordEls, wordContainer, categoryContainer) {
    const startIdx = ELEMENTS.CATEGORY_GRID.children.length * 4;
    const sortedWordEls = wordEls.filter(wordEl => parseInt(wordEl.style.order) >= startIdx + 4).toSorted((a, b) => parseInt(a.dataset.id) - parseInt(b.dataset.id));
    const topRowWordEls = ELEMENTS.WORDS.filter(wordEl => parseInt(wordEl.style.order) >= startIdx && parseInt(wordEl.style.order) < startIdx + 4 && !wordEls.includes(wordEl)).sort((a, b) => parseInt(a.style.order) - parseInt(b.style.order)); // [!] horrible
    return Promise.all(Array.from(sortedWordEls, (wordEl, idx) =>
        cardFX.swapElements(wordEl, topRowWordEls[idx])))
    .then(() => {
        ORDER.PREV = ORDER.CURR;
        ORDER.CURR = Array.from(
            ELEMENTS.WORDS.toSorted((a, b) => parseInt(a.style.order) - parseInt(b.style.order)),
            el => parseInt(el.dataset.id))})
    .then(() => 
        cardFX.fadeInCategory(categoryEl, categoryContainer, wordContainer));
}

function getCategoryElement (attempt) { // attempt is an Array of Numbers
    const categoryEl = ELEMENTS.CATEGORIES.filter(categoryEl =>
        categoryEl?.dataset.key == getCategoryData(attempt, GAMEDATA.categories));
    return (categoryEl.length) ? categoryEl[0] : undefined;
}

// [!] inefficient method- laziness
function getUnsolvedWordIds (cardEls) {
    return Array.from(cardEls.filter(e => !e.classList.contains("hide")), e => parseInt(e?.dataset?.id));
}

function updateAttemptCounter () {
    ELEMENTS.ATTEMPT_COUNTER.innerHTML = (ATTEMPTS.length + 1).toLocaleString("en-US");
}

async function queueGenerateCard () {
    return await fetch(API_ENDPOINT + "/generate-card", {
        method: "POST",
        keepalive: true,
        body: JSON.stringify({
            channel: discordSdk.channelId,
            userdata: {
                userid: userData.id,
                name: userData.global_name,
                avatar: userData.avatar,
                attempts: ATTEMPTS
            }
        })}
    );
}

function oncloseHandler () {
    if (ORDER.wasUpdated && ORDER.CURR != null) {
        queueRecordOrder(ORDER.CURR);
        if (discordSdk.guildId !== null)
            queueGenerateCard();
    } else if (newAttemptMade && discordSdk.guildId !== null)
        queueGenerateCard();
}

function onresizeHandler () {
    { // adjust button wrapping
        const buttonsEl = document.getElementById("buttons");
        if (buttonsEl)
            if (isOverflown(buttonsEl))
                buttonsEl.classList.add("wrap");
            else
                buttonsEl.classList.remove("wrap");
    }
}

async function setWinScreen (first = true) {
    queueGenerateCard();
    ELEMENTS.MENU.classList.add("hide");
    ELEMENTS.ATTEMPT_COUNTER.classList.add("hide");
    if (first)
        return await popup("You beat today's challenge!", 5000);
}

let loadingProgress = 0;
const LOADING_BAR = document.getElementById("loading-bar");
const moveProgress = (prog) => (loadingProgress += prog, LOADING_BAR.style.setProperty("--progress", loadingProgress));

window.onload = (e) => {
    ELEMENTS.WORD_GRID = document.getElementById("words");
    ELEMENTS.MENU = document.getElementById("buttons");
    ELEMENTS.CATEGORY_GRID = document.getElementById("categories");
    ELEMENTS.ATTEMPT_COUNTER = document.getElementById("attempt-count");
    Promise.all([
        // retreive categories
        fetch(API_ENDPOINT + "/get-gamedata")
            .then(resp => {
                moveProgress(.2);
                if (resp.ok) {
                    return resp.json();
                } else {
                    console.error("Failed to contact gamedata API endpoint"); // [!] add UI notification for this
                }
            }).then(data => {
                if (data) {
                    ({ categories: GAMEDATA.categories, challengeNum: GAMEDATA.challenge } = data);
                    GAMEDATA.ids = Array.from(Object.values(GAMEDATA.categories), (wordData) =>
                        Array.from(wordData, ({id}) => id).sort());
                    console.info("Loaded gamedata:", GAMEDATA);
                }
            }),
        // connect to discord actvity sdk
        Discord.getClient(API_ENDPOINT + "/discord-auth")
            .then(client_id => (
                moveProgress(.2),
                Discord.initSdk(client_id, API_ENDPOINT + "/discord-auth")))
            .catch(() => {
                popup("Failed to contact discord gateway! Restart and try again", 99 * 1000);
            })
            .then(({discordSdk: sdk, user})=> {
                if (!sdk) return;
                moveProgress(.2);
                discordSdk = sdk;
                userData = user;
                return fetch(
                        `${API_ENDPOINT}/get-userdata?id=${userData?.id}`
                    ).then(resp => {
                        moveProgress(.2);
                        if (resp.ok) {
                            return resp.json();
                        } else {
                            console.error("Failed to contact userdata API endpoint"); // [!] add UI notification for this
                        }
                    }).then(({ attempts, order }) => {
                        ORDER.PREV = order;
                        newAttemptMade = !Boolean(attempts);
                        if (attempts)
                            ATTEMPTS.push(...Array.from(attempts, attempt => attempt.toSorted()));
                    })
            })
    ]).then((_) => {
            console.debug(`Loaded previous attempts: ${ATTEMPTS}`);
            if (ORDER.wasUpdated)
                console.debug(`Loaded previous order: ${ORDER.PREV}`);
            // create card elements
            {
                const solvedWordIds = [];
                createCategoryElements(
                    Array.from(
                        Object.entries(GAMEDATA.categories),
                        ([key, value]) => [key, Array.from(value, ({word}) => word)]
                    )).forEach(categoryEl => ELEMENTS.CATEGORIES.push(categoryEl));

                // init previous correct attempts (if any)
                if (ATTEMPTS.length) {
                    updateAttemptCounter();
                    ATTEMPTS.filter(attempt => attemptIsCorrect(attempt, GAMEDATA.ids))
                        .forEach(correctAttempt => {
                            const categoryEl = getCategoryElement(correctAttempt);
                            if (categoryEl !== undefined) {
                                // add word id to blacklist
                                solvedWordIds.push(...correctAttempt);
                                // display the category
                                const ogTransDuration = getComputedStyle(categoryEl)?.getPropertyValue("--transition-duration");
                                categoryEl.style.setProperty("--transition-duration", "0");
                                ELEMENTS.CATEGORY_GRID.appendChild(categoryEl);
                                categoryEl.style.setProperty("--transition-duration", ogTransDuration);
                            } else {
                                console.warn(`Failed to find a matching category with word IDs: ${correctAttempt}`)
                            }
                        });
                }
                if (ELEMENTS.CATEGORY_GRID.children.length === 4) setWinScreen(false);
                else {
                    {
                        const wordIds = [];
                        Object.entries(GAMEDATA.categories).forEach(([_, words]) => {
                            words.forEach(({word, id}) => {
                                let wordEl = createCardElement(softHypenateText(word, 5), wordClickHandler, "word");
                                wordEl.dataset.id = id;
                                if (solvedWordIds.includes(id))
                                    wordEl.classList.add("hide");
                                ELEMENTS.WORDS.push(wordEl);
                                wordIds.push(id);
                            });
                        });
                        ORDER.CURR = !ORDER.wasUpdated ? shuffle(wordIds) : ORDER.PREV;
                        sortCardEls(ELEMENTS.WORDS, ORDER.CURR);
                        ELEMENTS.WORDS.forEach(wordEl => ELEMENTS.WORD_GRID.append(wordEl));
                    }
                    // buttons
                    {
                        BUTTONS.SUBMIT = document.getElementById("submit");
                        BUTTONS.SUBMIT.onclick = submitHandler;
                        BUTTONS.DESELECT = document.getElementById("deselect");
                        BUTTONS.DESELECT.onclick = deselectHandler;
                        BUTTONS.SHUFFLE = document.getElementById("shuffle");
                        BUTTONS.SHUFFLE.onclick = shuffleHandler;
                    }
                    // add game event messages to backend
                    {
                        document.addEventListener("visibilitychange", (e) => {
                            if (document.visibilityState === "hidden") oncloseHandler();
                        });
                        document.addEventListener("pagehide", oncloseHandler);
                        document.addEventListener("beforeunload", oncloseHandler);
                    }
                    window.addEventListener("resize", onresizeHandler);
                    onresizeHandler();
                }
            }
            moveProgress(.2);
            console.info("Finished loading");
            // display main page
            {
                const containerEl = document.getElementById("content-container");
                const loadingEl = document.getElementById("loading");
                containerEl.classList.remove("hide");
                loadingEl.classList.add("hide");
                containerEl.scrollTop = 0;
            }
        });
}
