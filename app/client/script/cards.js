import { waitForElementEvents } from "./utils.js";

// https://css-tricks.com/animating-layouts-with-the-flip-technique/
export async function animateSwap (originEl, targetEl, durationMs) { // FLIP
    const firstPos = originEl.getBoundingClientRect();
    const lastPos = targetEl.getBoundingClientRect();
    return await Promise.all([
        originEl.animate([
            {
                transformOrigin: "top left",
                transform: `translate(${
                    lastPos.left - firstPos.left
                }px, ${
                    lastPos.top - firstPos.top
                }px)`
            }, {
                transformOrigin: "top left",
                transform: "none"
            }], {
                direction: "reverse", // lmao idk
                duration: durationMs,
                easing: "ease",
                fill: "none"
            }
        ).finished,
        targetEl.animate([
            {
                transformOrigin: "top left",
                transform: `translate(${
                    firstPos.left - lastPos.left
                }px, ${
                    firstPos.top - lastPos.top
                }px)`
            }, {
                transformOrigin: "top left",
                transform: "none"
            }], {
                direction: "reverse", // lmao idk
                duration: durationMs,
                easing: "ease",
                fill: "none"
            }
        ).finished,
    ]);
}

export function createCardElement (content, onclick, ...classList) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card", ...classList);
    cardEl.innerHTML = content;
    if (onclick)
        cardEl.addEventListener("click", onclick);
    return cardEl;
}

export function createCategoryElements (categories) { // categories here is an Array of category entries, containing the category names and an Array of corrosponding words. Categories are to be sorted by difficulty
    return Array.from(categories, ([category, words], idx) => {
        const el = createCardElement(category, null, "category", `color-${idx + 1}`);
        el.appendChild(document.createElement("br"));
        el.dataset.key = category;
        const wordsEl = document.createElement("span");
        wordsEl.innerHTML = words.join(", ");
        el.appendChild(wordsEl);
        return el;
    });
}

// resolves to false if duration expires, and true if popup is dismissed by user
export function popup (message, durationMs = 1500) {
    // durationMs is added to css transition duration
    return new Promise((resolve, reject) => {
        try {
            const el = createCardElement(message, null, "popup");

            const removeEl = () => {
                el.classList.add("hide");
                el.addEventListener("transitionend", () => el.remove(), { once: true });
            };

            el.addEventListener("transitionend", () => {
                const timer = setTimeout(() => (removeEl(), resolve(false)), durationMs);
                el.addEventListener("click", () => {
                    clearTimeout(timer);
                    removeEl();
                    resolve(true);
                }, { once: true });
            }, { once: true });
            document.getElementById("content-container").appendChild(el);
        } catch (error) {
            reject(error);
        }
    });
};

function playAnimation (element, ...classNames) { // [!] may be redundant now- see waitForElementEvents from utils.js
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

export function getRowWordElements (rowIdx, wordContainer, columnCount = 4) {
    return [...wordContainer.children].filter(wordEl => parseInt(wordEl.style.order) >= rowIdx && parseInt(wordEl.style.order) < rowIdx + columnCount);
}

export function sortCardEls (cardEls, wordIds) {
    wordIds.forEach((wordId, idx) => {
        const idStr = String(wordId);
        const el = cardEls.filter(cardEl => cardEl.dataset.id == idStr)?.[0];
        if (el)
            el.style.order = String(idx);
    })
}

export const cardFX = {
    incorrect: async function (cardEls) {
        return await Promise.all(Array.from(cardEls,
            (cardEl) => playAnimation(cardEl, "shake-incorrect", "incorrect")
        ));
    },
    submit: async function (cardEls) {
        for ( const cardEl of cardEls ) {
            await playAnimation(cardEl, "jump");
        }
    },
    repeatAttempt: async function (cardEls) {
        return await Promise.all(Array.from(cardEls,
            (cardEl) => playAnimation(cardEl, "shake-incorrect")
        ));
    },
    swapElements: async function (originEl, targetEl) {
        return await animateSwap(originEl, targetEl, 1000)
            .then(() => {
                const originOrder = originEl.style.order;
                originEl.style.order = targetEl.style.order;
                targetEl.style.order = originOrder;
        });
    },
    fadeInCategory: async function (categoryEl, categoryContainer, wordContainer) {
        const startIdx = categoryContainer.children.length * 4;
        const wordEls = getRowWordElements(startIdx, wordContainer);
        categoryContainer.appendChild(categoryEl);
        return await Promise.all(Array.from(wordEls, wordEl => {
            wordEl.classList.add("hide");
        })).then(() => {
            
        });
    },
    // plays the animation for shuffling- does not actually shuffle
    shuffle: async function (cardEls, wordIds) {
        return await new Promise((resolve, reject) => {
            waitForElementEvents("transitionend", ...cardEls)
                .then(() => sortCardEls(cardEls, wordIds))
                .then(() => {
                    const transitionPromise = waitForElementEvents("transitionend", ...cardEls)
                    cardEls.forEach(el => el.classList.remove("blank"))
                    return transitionPromise; })
                .then(() => resolve());
            cardEls.forEach(cardEl =>
                cardEl.classList.add("blank"));
        });
    }
};
