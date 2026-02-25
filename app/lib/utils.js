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