import { isOverflowed } from "./utils.js";
import { animateMove, createCardElement } from "./cards.js";
import * as Discord from "./discord.js";

const API_ENDPOINT = window.origin + "/api";
let discordSdk = null;
let userData = null;
let selectedWords = 0;

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
    } else if (selectedWords < 3) {
        selectedWords++;
        wordEl.classList.add("selected");
    }
}

const wordClickHandler = (e) => { console.log(`clicked ${e.target?.innerHTML}`); selectWord(e.target) }

window.onload = (e) => {
    const containerEl = document.getElementsByClassName("content-container")?.[0];
    const cardGridEl = document.getElementById("card-grid");
    const categoryStackEl = document.getElementById("categories");
    Promise.all([
        fetch(API_ENDPOINT + "/get-gamedata")
        .then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.error("Failed to contact gamedata API endpoint"); // [!] add UI notification for this
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
                }).then(attempts => {
                    if (attempts)
                        return Array.from(attempts, attempt => attempt.sort());
                })
        }),
    ]).then(([categories, oldAttempts]) => {
            const categoryEls = [];
            const wordEls = [];

            console.debug(`Loaded previous attempts: ${oldAttempts}`);

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
        });
}

window.onresize = resizeCardHandler;