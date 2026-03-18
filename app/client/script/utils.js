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

export function attemptIsRepeat (attempt, oldAttempts) { // attempt and attempts within oldAttempts should already be sorted
    return oldAttempts.some((oldAttempt) =>
        attempt.every((_, i) => 
            oldAttempt[i] == attempt[i]));
}