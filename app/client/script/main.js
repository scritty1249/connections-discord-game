import { isOverflowed, attemptIsRepeat, attemptIsCorrect } from "./utils.js";
import { animateMove, createCardElement } from "./cards.js";
import * as Discord from "./discord.js";

const API_ENDPOINT = window.origin + "/api";
let discordSdk = null;
let userData = null;
let selectedWords = 0;
let categories = null;
let categoryIds = null;
const oldAttempts = [];

async function recordAttempt (attempt) { // attempt is expected to be a Set of 4 numbers
    try {
        const resp = await fetch(API_ENDPOINT + "/record-attempt?id=" + userData?.id, {
            method: "POST",
            body: JSON.stringify({attempt: [...attempt]})
        });
        return resp.ok ? true : undefined;
    } catch (err) {
        console.error(err);
        return undefined;
    }
}

// returns a Promise. Instantly resolves to false if attempt is a repeat
function submitAttempt () { // old attempts returned from api as an Array of 4-Number Arrays (2D).
    const selectedWordEls = document.getElementsByClassName("selected");
    if (selectedWordEls.length != 4) {
        console.error(`Something went wrong while submitting! ${selectedWordEls.length} words selected - 4 required`);
        return;
    }
    const words = Array.from(selectedWordEls, (wordEl) => parseInt(wordEl.dataset.id)).sort();
    [...selectedWordEls].forEach((wordEl) => wordEl.classList.remove("selected"));
    selectedWords = 0;
    // attempts within oldAttempts should already be sorted
    if (attemptIsRepeat(words, oldAttempts)) {
        return Promise.resolve(false);
    } else {
        if (attemptIsCorrect(words, categoryIds)) {
            // [!] temporary
            [...selectedWordEls].forEach((wordEl) => {
                wordEl.style.backgroundColor = "#019a01";
            });
        }
        return recordAttempt(new Set(words));
    }
}

function resizeCardHandler () {
    const biggestCardEl = document.querySelector('#card-grid .card[data-largest="true"]');
    if (biggestCardEl)
        document.getElementById("card-grid").style.setProperty("--card-width", `${biggestCardEl?.offsetWidth}px`);
    if (isOverflowed(document.getElementsByClassName("content-container")?.[0])) {
        // [!] TODO: hide page, display screen size message
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
    console.info(`clicked ${e.target?.innerHTML}`);
    selectWord(e.target);
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

window.onload = (e) => {
    const containerEl = document.getElementsByClassName("content-container")?.[0];
    const cardGridEl = document.getElementById("card-grid");
    const menuEl = document.getElementById("buttons");
    const categoryStackEl = document.getElementById("categories");
    Promise.all([
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
                    Array.from(wordData, ({id}) => id));
            }
        }),
        Discord.getClient(API_ENDPOINT + "/discord-auth")
        .then(client_id =>
            Discord.initSdk(client_id, API_ENDPOINT + "/discord-auth"))
        .then(({discordSdk: sdk, user})=> {
            discordSdk = sdk;
            userData = user;
            return fetch(
                    `${API_ENDPOINT}/get-attempts?id=${userData?.id}`
                ).then(resp => {
                    if (resp.ok) {
                        return resp.json();
                    } else {
                        console.error("Failed to contact userdata API endpoint"); // [!] add UI notification for this
                    }
                }).then(({attempts}) => {
                    if (attempts)
                        oldAttempts.push(Array.from(attempts, attempt => attempt.toSorted()));
                })
        }),
    ]).then((_) => {
            const categoryEls = [];
            const wordEls = [];

            console.debug(`Loaded previous attempts: ${oldAttempts}`);
            console.log(categories);

            // create card elements
            Object.entries(categories).forEach(([category, words]) => {
                categoryEls.push(createCardElement(category, null, "category"));
                words.forEach(({word, id}) => {
                    let wordEl = createCardElement(word, wordClickHandler, "word");
                    wordEl.dataset.id = id;
                    wordEls.push(wordEl);
                    cardGridEl.append(wordEl);
                });
            });
            // init previous correct attempts (if any)


            // main runtime
            {
                let biggestWordEl = wordEls.reduce((biggestWordEl, wordEl) => biggestWordEl.offsetWidth > wordEl.offsetWidth ? biggestWordEl : wordEl);
                biggestWordEl.dataset.largest = "true";
                biggestWordEl.style.setProperty("--card-width", "min-content");
                resizeCardHandler();
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
            // create submit button
            {
                const submitBtn = createCardElement("submit", submitHandler, "submit");
                menuEl.append(submitBtn);
            }
        });
}

window.onresize = resizeCardHandler;