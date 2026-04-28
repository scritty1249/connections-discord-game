import { dateToString, formatNumberString, getChallengeNumber } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";
import { GameDB, UserDB } from "./store.js";
import { createCanvasObject, drawScoreHorizontal, drawScoreVertical, canvasToImage, CANVAS_POSITION } from "./draw.js";
import { sendChannelResults, getChannelMessage } from "../lib/discord.js";

async function fetchGameData(gameDate) {
    const endpoint = ENDPOINT.GAME_DATA + dateToString(gameDate) + ".json"
    const request = new Request(endpoint, { credentials: "include" });
    const response = await (await fetch(request)).json();
    if (response.status?.toUpperCase() !== "OK") {
        console.error(request, response);
        throw new Error(`Something went wrong while requesting game data from NYT servers. Status: ${response.status}`);
    }
    const data = response.categories;
    const gamedata = {
        challengeNum: getChallengeNumber(gameDate),
        categories: {}
    };
    data.forEach(({title, cards}) => gamedata.categories[title] = Array.from(cards, c => ({word: c.content, id: c.position}) )); // card "position" is actually id (internally). The "positions" stay the same even after shuffing
    return gamedata;
}

async function storeGameData(gamedata) {
    const response = await GameDB.set(gamedata);
    if (response.status?.toUpperCase() !== "OK") {
        console.error(response);
        throw new Error(`Something went wrong while writing to Vercel Edge Database. Status: ${response.status}`);
    }
    return response;
}

async function generateScoreImage(challengeNumber, ...userdatas) { // userdata = { attempts, avatar, id }
    const { canvas, ctx } = createCanvasObject(challengeNumber);
    if (userdatas.length === 1) { // one player (horizontal card)
        const { id, attempts, avatar, stats } = userdatas[0];
        await drawScoreHorizontal(
            ctx,
            CANVAS_POSITION(1),
            attempts,
            id,
            avatar,
            stats
        );
    } else { // multiple players (vertical cards)
        const draws = Promise.all(Array.from(userdatas,
            ({ id, attempts, avatar, stats }, idx) =>
            drawScoreVertical(
                ctx,
                CANVAS_POSITION(idx + 1, userdatas.length),
                attempts,
                id,
                avatar,
                stats
            )
        ));
        try {
            await draws;
        } catch (error) {
            console.error("Failed while generating image:", error);
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
        if (await wipeAttempts()) {
            console.log("Cleared userdata");
            console.log("Cleared channels cache");
            return true;
        }
        return false;
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
    const userdata = await UserDB.getUser(userid);
    if (userdata === undefined) {
        await UserDB.newUser(userid);
        return {
            attempts: [], // don't create a key for attempts unless needed (when they submit an attempt). We are on the FREE storage tier
            order: null // while we could generate an order here, we can stay within quota much more easily by offloading the task to the client.
        };
    }
    return userdata;
}

export async function getAttempts(userid) {
    const userdata = await UserDB.getUser(userid);
    return userdata === undefined ? [] : userdata.attempts;
}

export async function newAttempt(userid, attempt) { // attempt here is a Set of 4 ids (Numbers)
    return await UserDB.newAttempt(userid, [...attempt]);
}

export async function newOrder(userid, order) { // order is an Array of 16 ids (Numbers)
    return await UserDB.setOrder(userid, order);
}

export async function scoreImage(userdata, ...userdatas) { // expects {attempts, userid, avatar}
    const datas = [userdata, ...userdatas];
    const { categories, challengeNum } = await getGameData();
    const categoryWordIds = Array.from(Object.values(categories), category => Array.from(category, (word) => word.id));
    const newData = Array.from(datas, ({attempts, userid, avatar}) => 
        ({stats: getCategoryStats(attempts, categoryWordIds), attempts: matchAttemptsToCategory(attempts, categories), id: userid, avatar: avatar}));
    return await generateScoreImage(challengeNum, ...newData);
}

export async function sendScorecard (channelid) {
    const channeldata = await UserDB.getChannel(channelid);
    const messageid = channeldata.message === null ? await getChannelMessage(channelid, new Date()) : channeldata.message;
    const usernames = [];
    const imgBlob = await scoreImage(...(await Promise.all(Array.from(
        Object.keys(channeldata.participants),
        async (participant) => {
            usernames.push(channeldata.participants[participant].name);
            const userdata = await UserDB.getUser(participant);
            return {
                attempts: userdata === undefined ? [] : userdata.attempts,
                avatar: channeldata.participants[participant].avatar,
                userid: participant
            };
        }
    ))));
    const newMessageid = await sendChannelResults(channelid, messageid, usernames, imgBlob);
    if (newMessageid && newMessageid != messageid)
        await UserDB.setChannelMessage(channelid, newMessageid);
    else if (!newMessageid)
        console.warn("Unable to send or update message in channel. Does the bot lack permissions?");
}

// returns updated channel data for chaining
export async function updateChannelParticipants (channelid, userid, username, avatar) {
    const userdata = { name: String(username), avatar: String(avatar) };
    const channels = await UserDB.getChannels();
    if (Object.keys(channels).includes(String(channelid))) {
        await UserDB.setChannelUser(channelid, userid, username, avatar);
    } else {
        // create new channel entry if one does not already exist
        await UserDB.newChannel(channelid, userid, username, avatar);
    }
    return await UserDB.getChannel(channelid);
}

export function getCategoryStats (attempts, categoryWordIds) { // categoryWordIds is an Array of Arrays, with the index of each nested Array corrosponding to category difficulty and each Number within matching the ID of a word for that category.
    const stats = {
        "1": null,
        "2": null,
        "3": null,
        "4": null,
        total: attempts.length ? formatNumberString(attempts.length) : null
    };
    attempts.forEach((attempt, idx) => {
        let difficulty = 1;
        for (const categoryWords of categoryWordIds) {
            if (categoryWords.every(wordId => attempt.includes(wordId))) {
                stats[String(difficulty)] = formatNumberString(idx + 1);
                return;
            }
            difficulty++;
        }            
    });
    return stats;
}

export async function wipeUserAttempts (userid) {
    return Boolean(await UserDB.dropUser(userid));
}
