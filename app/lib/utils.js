export function isDateFormat(dateString) {
    return typeof dateString == "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(dateString);
}

export function dateToString(dateObj) {
    if (! dateObj instanceof Date)
        throw new Error(`Parameter must be a Date object, not [${typeof dateObj}].`);
    const _pad2Digits = (dateNum) => dateNum.toString().padStart(2, "0");
    const year = dateObj.getFullYear().toString();
    const month = _pad2Digits((dateObj.getMonth() + 1));
    const day = _pad2Digits((dateObj.getDate()));
    return `${year}-${month}-${day}`;
}

export function unixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

export async function promiseTimeout (timeoutMs) {
    return await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

export function isSameDay (date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

export function formatNumberString (number) {
    return number.toLocaleString('en-US'); // because no other kind matters! lol
}

export function getChallengeNumber (currentDate) {
    if (! currentDate instanceof Date)
        throw new Error(`Parameter must be a Date object, not [${typeof currentDate}].`);
    const CONNECTIONS_START_DATE = new Date("2023-06-12");
    const diffMs = Math.abs(currentDate - CONNECTIONS_START_DATE);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 1000ms * 60s * 60m * 24h
}