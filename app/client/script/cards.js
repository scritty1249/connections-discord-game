// https://css-tricks.com/animating-layouts-with-the-flip-technique/

export async function animateMove (originEl, targetEl, durationMs) { // FLIP
    const firstPos = originEl.getBoundingClientRect();
    const lastPos = targetEl.getBoundingClientRect();
    // invert
    const deltaX = firstPos.left - lastPos.left;
    const deltaY = firstPos.top - lastPos.top;
    return originEl.animate([
        {
            transformOrigin: "top left",
            transform: `translate(${deltaX}px, ${deltaY}px)`
        }, {
            transformOrigin: "top left",
            transform: "none"
        }], {
            duration: durationMs,
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

export function createCategoryElements (categories) { // categories here is an Array of Strings, containing the category names
    return Array.from(categories.toSorted(), (category, idx) =>
        createCardElement(category, null, "category", `color-${idx + 1}`));
}

export function getCardElements (cardElements, ...ids) {
    const idStrs = Array.from(ids, id => String(id));
    return cardElements.filter(cardEl => idStrs.includes(cardEl.dataset.id));
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

export function getRowWordElements (rowIdx, wordContainer, columnCount = 4) {
    return [...wordContainer.children].slice(rowIdx, rowIdx + columnCount);
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
    moveElement: function (originEl, targetEl) {
        return animateMove(originEl, targetEl, 2000)
            .then(() => 
                targetEl.replaceWith(originEl));
    },
    swapElements: function (originEl, targetEl) {
        return Promise.all([
            animateMove(originEl, targetEl, 2000),
            animateMove(targetEl, originEl, 2000)
        ]).then(() => {
            const targetNextSibling = targetEl.nextSibling;
            const targetParent = targetEl.parentNode;
            originEl.replaceWith(targetEl);
            if (targetNextSibling)
                targetParent.insertBefore(originEl, targetNextSibling);
            else // no next sibling, element must be last
                targetParent.appendChild(originEl);
        });
    },
    fadeInCategory: function (categoryEl, categoryContainer, wordContainer) {
        const startIdx = categoryContainer.children.length * 4;
        const wordEls = getRowWordElements(startIdx, wordContainer);
        categoryContainer.appendChild(categoryEl);
        return Promise.all(Array.from(wordEls, wordEl => {
            wordEl.classList.add("hide");
        })).then(() => {
            
        });
    }
};
