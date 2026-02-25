import { createCardElement } from "/client/script/utils.js";

const API_ENDPOINT = window.origin + "/api/";

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
                    let wordEl = createCardElement(word, "word")
                    wordEl.dataset.id = id;
                    wordEls.push(wordEl);
                    cardGridEl.append(wordEl);
                });
            });
        });
}