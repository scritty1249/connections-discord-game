import { isOverflowed } from "/client/script/utils.js";
import { animateMove, createCardElement } from "/client/script/cards.js";

const API_ENDPOINT = window.origin + "/api/";

function resizeCardHandler () {
    const biggestCardEl = document.querySelector('#card-grid .card[data-largest="true"]');
    if (biggestCardEl)
        document.getElementById("card-grid").style.setProperty("--card-width", `${biggestCardEl?.offsetWidth}px`);
    if (isOverflowed(document.getElementsByClassName("content-container")?.[0])) {
        // [!] TODO: hide page, display screen size message
    }
}

window.onload = (e) => {
    const cardGridEl = document.getElementById("card-grid");
    const categoryStackEl = document.getElementById("categories");
    Promise.all([
        fetch(API_ENDPOINT + "get-gamedata")
        .then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.error("Failed to contact gamedata API endpoint"); // [!] add UI notification for this
            }
        }),
        fetch(API_ENDPOINT + "get-attempts", 
        {
            // [!] TODO: include user identifier from Discord SDK
        }).then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.error("Failed to contact userdata API endpoint"); // [!] add UI notification for this
            }
        }).then(attempts => {
            if (attempts)
                return Array.from(attempts, attempt => attempt.sort());
        })
    ]).then(([categories, attempts]) => {
            const categoryEls = [];
            const wordEls = [];
            // create card elements
            Object.entries(categories).forEach(([category, words]) => {
                categoryEls.push(createCardElement(category, "category"));
                words.forEach(({word, id}) => {
                    let wordEl = createCardElement(word, "word");
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
        });
}

window.onresize = resizeCardHandler;