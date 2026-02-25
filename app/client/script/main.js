const API_ENDPOINT = window.origin + "/api/";
let CATEGORIES = undefined;

fetch(API_ENDPOINT + "get-gamedata")
    .then(resp => {
        if (resp.ok) CATEGORIES = resp.json();
        else {
            console.error("Failed to contact API"); // [!] add UI notification for this
        }
    });

window.onload = (e) => {
    if (CATEGORIES === undefined)
        return; // [!] failed
    const cardGridEl = document.getElementById("card-grid");
    const categoryStackEl = document.getElementById("categories");
    CATEGORIES.then(categories => {
        categoryEls = [];
        wordEls = [];
        // create card elements
        categories.entries().forEach(([category, words]) => {
            let categoryEl = document.createElement("div");
            categoryEl.classList.add("category");
            categoryEl.innerHTML = category;
            categoryEls.push(categoryEl);
            words.forEach(({word, id}) => {
                let wordEl = document.createElement("div");
                wordEl.classList.add("word");
                wordEl.dataset.id = id;
                wordEl.innerHTML = word;
                wordEls.push(wordEl);
                cardGridEl.append(wordEl);
            });
        });
    });
}