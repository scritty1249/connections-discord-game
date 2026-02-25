export function createCardElement (content, ...classList) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", ...classList);
    cardEl.innerHTML = content;
    return cardEl;
}