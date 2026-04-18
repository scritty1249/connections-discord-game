export function isOverflowed (el) {
  return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
}

export function attemptIsCorrect (attempt, categories) { // categories is an Array of category word ids ([[Number, ...], ...])
    // expects attempt as Array of Numbers, nested categories should already be sorted
    return categories.some(category =>
        attempt.length === category.length &&
        category.every((id, idx) => id === attempt[idx])
    );
}

export function attemptIsOneAway(attempt, categories) { // categories is an Array of category word ids ([[Number, ...], ...])
    // expects attempt as Array of Numbers, nested categories should already be sorted

    // could parse as a Set here but the sizes are so negligable that conversion isn't worth the resources
    return categories.some(category => category.filter(wordId => attempt.includes(wordId)).length == 3);
}

export function attemptIsRepeat (attempt, oldAttempts) { // attempt and attempts within oldAttempts should already be sorted
    return oldAttempts.some((oldAttempt) =>
        attempt.every((_, i) => 
            oldAttempt[i] == attempt[i]));
}

export function getCategoryData (categoryIds, categories) {
    const categoryIdSet = new Set(categoryIds);
    const categorySets = Array.from(Object.entries(categories), ([category, words]) =>
        [category, new Set(Array.from(words, ({id}) => id))]
    );
    for (const [category, wordSet] of categorySets) {
        if (wordSet.symmetricDifference(categoryIdSet).size === 0)
            return category;
    }
    return undefined;
}

// Fisher-Yates, shuffles in place
export function shuffle (array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function softHypenateText (text, maxlen) {
    const segments = text.split(/(\s+)/);
    const words = segments.filter((_, i) => i % 2 === 0);
    const spaces = segments.filter((_, i) => i % 2 === 1);
    const hypenated = Array.from(words,
        (word, idx) => {
            const result = [];
            for (let i = 0; i < word.length; i += maxlen) {
                result.push(word.substring(i, i + maxlen));
            }
            return result.join("&shy;") + (spaces[idx] == undefined ? "" : spaces[idx]);
    });
    return hypenated.join("");
}

export async function waitForElementEvents (eventName, ...elements) {
    return await Promise.all(Array.from(elements, element =>
        new Promise((resolve, reject) => {
            element.addEventListener(eventName, () => {
                resolve(element);
            }, { once: true });
    })));
}
