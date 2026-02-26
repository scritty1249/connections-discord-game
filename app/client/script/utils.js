export function isOverflowed (el) {
  return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
}

export function attemptIsCorrect (attempt, categories) { // categories is an Array of category word ids ([[Number, ...], ...])
    // expects attempt as Array of Numbers, nested categories should already be sorted
    return categories.any(category =>
        attempt.length === category.length &&
        category.every(([id, idx]) => id === attempt[idx])
    );
}