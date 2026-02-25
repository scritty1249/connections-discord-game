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