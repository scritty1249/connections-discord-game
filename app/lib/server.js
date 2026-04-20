import { dateToString } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";
import { GameDB, UserDB } from "./store.js";
import { createCanvasObject, drawScoreHorizontal, drawScoreVertical, canvasToImage, CANVAS_POSITION } from "./draw.js";

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

async function generateScoreImage(userdata, ...otherdata) { // userdata = { attempts, avatar, id }
    const { canvas, ctx } = createCanvasObject();
    if (!otherdata.length) { // one player (horizontal card)
        const { id, attempts, avatar } = userdata;
        await drawScoreHorizontal(
            ctx,
            CANVAS_POSITION(1),
            attempts,
            id,
            avatar
        );
    } else { // multiple players (vertical cards)
        const datas = [userdata, ...otherdata.slice(0, Math.min(otherdata.length, 3))];
        const draws = Promise.all(Array.from(datas,
            ({ id, attempts, avatar }, idx) =>
            drawScoreVertical(
                ctx,
                CANVAS_POSITION(idx + 1, datas.length),
                attempts,
                id,
                avatar
            )
        ));
        try {
            await draws;
        } catch (error) {
            console.error(error);
        }
    }
    return await canvasToImage(canvas);
}

function matchAttemptsToCategory(attempts, categories) { // categories is raw data from Database
    const categoryDifficulties = {};
    const solvedCategories = [];
    const categoryData = Object.values(categories);
    attempts.forEach((attempt) => {
        for ( const [idx, cd] of categoryData.entries()) {
            if (attempt.every(wordId => Array.from(cd, ({id}) => id).includes(wordId))) {
                solvedCategories.push(idx);
                return;
            }
        }
    });
    categoryData.forEach((category, idx) =>
        category.forEach((wordData) =>
            categoryDifficulties[String(wordData.id)] = idx + 1));
    return Array.from(attempts, (attempt) =>
        Array.from(attempt, (wordId) =>
            categoryDifficulties[String(wordId)] === undefined
            ? -1
            : solvedCategories.includes(categoryDifficulties[String(wordId)] - 1)
            ? categoryDifficulties[String(wordId)]
            : 0
        ));
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
            UserDB.getlist(userid, "attempts", []),
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
    return await UserDB.append(userid, "attempts", [...attempt]);
}

export async function newOrder(userid, order) { // order is an Array of 16 ids (Numbers)
    return await UserDB.set(userid, "order", order);
}

export async function scoreImage(userdata, ...userdatas) { // expects {attempts, userid, avatar}
    const datas = [userdata, ...userdatas];
    const gamedata = await getGameData();
    const newData = Array.from(datas, ({attempts, userid, avatar}) => 
        ({attempts: matchAttemptsToCategory(attempts, gamedata), id: userid, avatar: avatar}));
    return await generateScoreImage(...newData);
}

