import { createCardElement } from "/client/script/utils.js";

const API_ENDPOINT = window.origin + "/api/";

function resizeCardHandler () {
    const biggestCardEl = document.querySelector('#card-grid .card[data-largest="true"]');
    if (biggestCardEl)
        document.getElementById("card-grid").style.setProperty("--card-width", `${biggestCardEl?.offsetWidth}px`);
}

window.onload = (e) => {
    const cardGridEl = document.getElementById("card-grid");
    const categoryStackEl = document.getElementById("categories");
    fetch(API_ENDPOINT + "get-gamedata")
        .then(resp => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.error("Failed to contact API"); // [!] add UI notification for this
            }
        }).then(categories => {
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
            // main runtime
            wordEls.reduce((biggestWordEl, wordEl) => biggestWordEl.offsetWidth > wordEl.offsetWidth ? biggestWordEl : wordEl)?.dataset.largest = "true";
            resizeCardHandler();
        });
}

window.addEventListener("resize", resizeCardHandler);