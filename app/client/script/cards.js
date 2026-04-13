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

export function createCardElement (content, onclick, ...classList) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", ...classList);
    cardEl.innerHTML = content;
    if (onclick)
        cardEl.addEventListener("click", onclick);
    return cardEl;
}

export function getCardElements (cardElements, ...ids) {
    return [...cardElements].filter(cardEl => ids.includes(cardEl.dataset.id));
}

function playAnimation (element, ...classNames) {
    return new Promise((resolve, reject) => {
        try {
            element.classList.add(...classNames);
            element.addEventListener("animationend", (event) => {
                element.classList.remove(...classNames);
                resolve(event);
            }, { once: true });
        } catch (error) {
            element.classList.remove(...classNames);
            reject(error);
        }
    });
}

export const cardFX = {
    incorrect: function (cardEls) {
        return Promise.all(Array.from(cardEls,
            (cardEl) => playAnimation(cardEl, "shake-incorrect", "incorrect")
        ));
    },
    // [!] temp function, remove when animateMove() works
    correct: function (cardEls) {
        cardEls.forEach(cardEl => cardEl.classList.add("correct"));
        return Promise.resolve();
    },
    repeatAttempt: function (cardEls) {
        return Promise.all(Array.from(cardEls,
            (cardEl) => playAnimation(cardEl, "shake-incorrect")
        ));
    },
};