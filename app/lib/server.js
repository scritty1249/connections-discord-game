import { dateToString } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";
import { GameDB, UserDB } from "./store.js";


export async function fetchGameData(gameDate) {
    const endpoint = ENDPOINT.GAME_DATA + dateToString(gameDate) + ".json"
    const request = new Request(endpoint, { credentials: "include" });
    const response = await (await fetch(request)).json();
    if (response.status?.toUpperCase() !== "OK") {
        console.error(request, response);
        throw new Error(`Something went wrong while requesting game data from NYT servers. Status: ${response.status}`);
    }
    const data = response.categories;
    const categories = {};
    data.forEach(({title, cards}) => categories[title] = Array.from(cards, c => ({word: c.content, id: c.position}) )); // card "position" is actually id (internally). The "positions" stay the same even after shuffing
    return categories;
}

export async function storeGameData(gamedata) {
    const response = await GameDB.set(gamedata);
    if (response.status?.toUpperCase() !== "OK") {
        console.error(response);
        throw new Error(`Something went wrong while writing to Vercel Edge Database. Status: ${response.status}`);
    }
    return response;
}

export async function getGameData() {
    return await GameDB.get();
}

export async function wipeAttempts() {
    // deletes attempts for all users
    return await UserDB.drop();s
}

export async function getAttempts(userid) {
    if (await UserDB.exists(userid)) {
        return await UserDB.get(userid);
    } else {
        return [];
    }
}

export async function newAttempt(userid, attempt) { // attempt here is a Set of 4 ids (Numbers)
    // [!] might need to validate a timestamp here
    if (await UserDB.exists(userid)) {
        const attempts = await UserDB.get(userid);
        attempts.push(attempt);
        return await UserDB.set(userid, attempts);
    } else {
        return await UserDB.set(userid, [attempt]);
    }
}