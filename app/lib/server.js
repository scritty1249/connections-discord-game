import { dateToString } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";
import { GameDB, UserDB } from "./store.js";
import { default as nacl } from "tweetnacl";

export function verifyDiscordRequest(requestHeaders, requestBodyStr) {
    const sig = requestHeaders?.get("X-Signature-Ed25519");
    const stamp = requestHeaders?.get("X-Signature-Timestamp");
    const body = requestBodyStr; // raw body should be a str, not bytes

    return nacl.sign.detached.verify(
        // Buffers are Nodejs things, since vercel's Uint8Array.fromHex isn't fucking working
        Buffer.from(stamp + body),
        Buffer.from(sig, "hex"),
        Buffer.from(process.env.DISCORD_PUBLIC_KEY, "hex")
    );
}

async function fetchGameData(gameDate) {
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

async function storeGameData(gamedata) {
    const response = await GameDB.set(gamedata);
    if (response.status?.toUpperCase() !== "OK") {
        console.error(response);
        throw new Error(`Something went wrong while writing to Vercel Edge Database. Status: ${response.status}`);
    }
    return response;
}

export async function refreshGamestate() {
    try {
        const data = await fetchGameData(new Date());
        console.debug(data);
        console.info("Fetched gamedata");
        console.debug(await storeGameData(data));
        console.info("Saved gamedata");
        await wipeAttempts();
        console.log("Cleared userdata");
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function getGameData() {
    return await GameDB.get();
}

export async function wipeAttempts() {
    // deletes attempts for all users
    return await UserDB.drop();
}

export async function isUserAdmin(userid) {
    const adminList = await GameDB.admins();
    return adminList.includes(userid);
}

export async function getUserData(userid) {
    if (await UserDB.exists(userid, "order")) {
        const values = await Promise.all([
            UserDB.get(userid, "attempts", []),
            UserDB.get(userid, "order")
        ]);
        return {
            attempts: values[0],
            order: values[1]
        };
    } else {
        return {
            attempts: [], // don't create a key for attempts unless needed (when they submit an attempt). We are on the FREE storage tier
            order: null // while we could generate an order here, we can stay within quota much more easily by offloading the task to the client.
        };
    }
}

export async function newAttempt(userid, attempt) { // attempt here is a Set of 4 ids (Numbers)
    let attemptArr = [...attempt];
    // [!] might need to validate a timestamp here
    if (await UserDB.exists(userid, "attempts")) {
        return await UserDB.append(userid, "attempts", attemptArr);
    } else {
        return await UserDB.set(userid, "attempts", [attemptArr]);
    }
}

export async function newOrder(userid, order) { // order is an Array of 16 ids (Numbers)
    return await UserDB.set(userid, "order", order);
}
