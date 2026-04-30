// import { get, getAll, has, del, set, setAll } from '@vercel/edge-config';
import * as Edge from "@vercel/edge-config";
import { Redis } from "@upstash/redis";
import { EDGE_WRITE } from "./endpoints.js";
import { Token, User, Channel } from "./structs.js";

const redis = Redis.fromEnv();
const GAMEDATA_KEY = "gamedata";
const ADM_LIST_KEY = "admins";

// [!] TODO: determine if quota limits will allow for logging. If so, implement at THIS LAYER.
export const UserDB = {
    _prefix: {
        user: "U_",
        channel: "CHANNELS"
    },
    drop: async function () { // deletes ALL ENTRIES.
        try {
            await redis.flushdb();
            return await this._init();
        } catch (error) {
            console.error("UserDB Flush failed!", error);
            return false;
        }
    },
    _exists: async function (key) {
        return await redis.exists(key);
    },
    _init: async function () {
        try {
            await redis.json.set(this._prefix.channel, "$", {});
            return true;
        } catch (error) {
            console.error("UserDB Initalization failed!", error);
            return false;
        }
    },
    // Userdata related functions
    newUser: async function (user) {
        return await redis.json.set(this._prefix.user + user.id, "$", user);
    },
    setOrder: async function (userid, order) {
        return await redis.json.set(this._prefix.user + userid, "$.order", order);
    },
    newAttempt: async function (userid, attempt) {
        return await redis.json.arrappend(this._prefix.user + userid, "$.attempts", attempt);
    },
    getUser: async function (userid) { // json makes this a single call, so not wasteful to get everything here all the time...
        const data = (await redis.json.get(this._prefix.user + userid, "$"))?.[0];
        return data === undefined
            ? User()
            : User(userid, data.attempts, data.order);
    },
    dropUser: async function (userid) {
        return await redis.del(this._prefix.user + userid);
    },
    // Channel related data
    getChannels: async function () {
        return (await redis.json.get(this._prefix.channel, "$"))?.[0];
    },
    getChannel: async function (channelid) {
        const channel = (await redis.json.get(this._prefix.channel, `$['${channelid}']`))?.[0];
        return channel === undefined
            ? null
            : Channel(channel);
    },
    newChannel: async function (channelid, interactionToken = null, participant = null, isGuild = true) {
        return await redis.json.set(this._prefix.channel, `$['${channelid}']`, {
            isGuild: isGuild,
            tok: {
                recent: interactionToken ?? Token(),
                msg: Token()
            },
            msg: Token(),
            participants: participant ? { [participant.id]: participant } : {}
        });
    },
    setChannelParticipant: async function (channelid, participant) {
        return await redis.json.set(this._prefix.channel, `$['${channelid}'].participants['${participant.id}']`, participant);
    },
    setChannelMessage: async function (channelid, messageToken) {
        return await redis.json.set(this._prefix.channel, `$['${channelid}'].msg`, messageToken);
    },
    setChannelTokenRecent: async function (channelid, token) {
        return await redis.json.set(this._prefix.channel, `$['${channelid}'].tok.recent`, token);
    },
    setChannelTokenMessage: async function (channelid, token) {
        return await redis.json.set(this._prefix.channel, `$['${channelid}'].tok.msg`, token);
    },
};

export const GameDB = {
    admins: async function () {
        return await Edge.get(ADM_LIST_KEY);
    },
    get: async function () {
        return await Edge.get(GAMEDATA_KEY);
    },
    set: async function (gamedata) {
        const response = await fetch(EDGE_WRITE, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`
            },
            body: JSON.stringify({
                items: [
                    {
                        operation: "upsert",
                        key: GAMEDATA_KEY,
                        value: gamedata
                    }
                ]
            })
        });
        return await response.json();
    }
};
