import { dateToString, formatNumberString, getChallengeNumber, unixTimestamp } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";
import { GameDB, UserDB } from "./store.js";
import { createCanvasObject, drawScoreHorizontal, drawScoreVertical, canvasToImage, CANVAS_POSITION } from "./draw.js";
import { editInteractionMessage, sendInterationMessage, isTokenValid, generateScorecardBody } from "../lib/discord.js";
import { User, Snowflake, Token, Participant, ParticipantCardData } from "./structs.js";

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

async function generateScoreImage(challengeNumber, ...userdatas) { // userdata = { attempts, avatar, id, stats }
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

async function getParticipantCardData (categories, ...participants) {
    const categoryWordIds = Array.from(Object.values(categories), category => Array.from(category, (word) => word.id));
    const users = await Promise.all(Array.from(
        participants, (participant) =>
            UserDB.getUser(participant.id)
                .then((user) => [user, participant])));
    return Array.from(users, ([user, participant]) => {
        const cardData = ParticipantCardData(user.id, participant.avatar, matchAttemptsToCategory(user.attempts, categories));
        cardData.stats.total = formatNumberString(user.attempts.length);
        user.attempts.forEach((attempt, idx) => {
            let difficulty = 1;
            for (const categoryWords of categoryWordIds) {
                if (categoryWords.every(wordId => attempt.includes(wordId))) {
                    cardData.stats[String(difficulty)] = formatNumberString(idx + 1);
                    return;
                }
                difficulty++;
            }
        });
        return cardData;
    });
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

export async function wipeUserAttempts (userid) {
    return Boolean(await UserDB.dropUser(userid));
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
    const user = await UserDB.getUser(userid);
    if (user.id === null) {
        const newUser = User(userid);
        await UserDB.newUser(newUser);
        return newUser;
    }
    return user;
}

export async function getAttempts(userid) {
    return (await UserDB.getUser(userid)).attempts;
}

export async function newAttempt(userid, attempt) { // attempt here is a Set of 4 ids (Numbers)
    return await UserDB.newAttempt(userid, [...attempt]);
}

export async function newOrder(userid, order) { // order is an Array of 16 ids (Numbers)
    return await UserDB.setOrder(userid, order);
}

export async function scoreImage(...users) {
    const { categories, challengeNum } = await getGameData();
    
}

export async function replyScorecard (channelid) {
    const channel = await UserDB.getChannel(channelid);
    const participants = Object.values(channel.participants);
    if (channel === null) return;
    if (!Object.values(channel.participants).length) return console.warn("Attempted to generate scorecard for a channel with no participants");
    
    // generate card
    const { categories, challengeNum } = await getGameData();
    const participantCardData = await getParticipantCardData(categories, ...participants);
    const participantNames = Array.from(participants, ({ name }) => name);

    const imageBlob = await generateScoreImage(challengeNum, ...participantCardData);
    const messageBody = generateScorecardBody(participantNames, imageBlob, !channel.isGuild);

    // message to discord
    if (isTokenValid(channel.tok.recent)) {
        if (
            channel.tok.recent.id == channel.tok.msg.id
            && (await editInteractionMessage(channel.tok.msg.id, channel.msg.id, messageBody)) !== null
        ) return console.debug("Edited message for interaction");
        else console.debug("Failed to edit interaction using message token");
        // send new message if edit fails or recent token is not from recent message
        const message = await sendInterationMessage(channel.tok.recent.id, messageBody);
        if (message !== null)
            return await Promise.all([
                UserDB.setChannelMessage(channelid, Token(message.id, unixTimestamp())),
                UserDB.setChannelTokenMessage(channelid, channel.tok.recent)
            ]).then(() => console.debug("Sent new message for interaction"));
    }
    // failed
    const nullToken = Token();
    await Promise.all([
        UserDB.setChannelTokenRecent(channelid, nullToken),
        UserDB.setChannelTokenMessage(channelid, nullToken)
    ]);
    console.debug("Failed to send or edit message for interaction. No valid token to edit recent message or send a new one");
}

// Updates most recent interaction token for a specified channel. Creates a new channel entry if one does not already exist.
export async function touchChannel (channelid, interactionToken, isGuild) {
    const channel = await UserDB.getChannel(channelid);
    const token = Token(interactionToken, unixTimestamp());
    if (channel === null)
        await UserDB.newChannel(channelid, token, null, isGuild);
    else
        await UserDB.setChannelTokenRecent(channelid, token);
}

export async function addChannelParticipant (channelid, participant) {
    const channel = await UserDB.getChannel(channelid);
    if (channel === null) {
        // create new channel entry if one does not already exist
        await UserDB.newChannel(channelid, null, participant);
    } else if (
        !Object.keys(channel.participants).includes(participant?.id)
        || !channel.participants[participant.id].equals(participant)
    ) {
        // update if any part of the Participant changed, or if participant does not yet exist
        await UserDB.setChannelParticipant(channelid, participant);
    }
}
