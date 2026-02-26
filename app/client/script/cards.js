// https://css-tricks.com/animating-layouts-with-the-flip-technique/

export function animateMove (element, transform, duration) { // FLIP method
    const firstPos = element.getBoundingClientRect();
    const lastElement = transform(); // transform function should return the element with the new position
    const lastPos = lastElement.getBoundingClientRect();
    // invert
    const deltaX = firstPos.left - lastPos.left;
    const deltaY = firstPos.top - lastPos.top;
    const deltaW = firstPos.width / lastPos.width;
    const deltaH = firstPos.height / lastPos.height;
    return element.animate([
        {
            transformOrigin: "top left",
            transform: `
                translate(${deltaX}px, ${deltaY}px)
                scale(${deltaW}, ${deltaH})
            `
        }, {
            transformOrigin: "top left",
            transform: "none"
        }], {
            duration: `${duration}s`,
            easing: "ease-in-out",
            fill: "both"
        }
    ).finished;
}

export function createCardElement (content, onclick = (e) => {}, ...classList) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", ...classList);
    cardEl.innerHTML = content;
    cardEl.addEventListener("click", onclick);
    return cardEl;
}

export function getCardElements (cardElements, ...ids) {
    return [...cardElements].filter(cardEl => ids.includes(cardEl.dataset.id));
}
