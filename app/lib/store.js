// import { get, getAll, has, del, set, setAll } from '@vercel/edge-config';
import * as Edge from "@vercel/edge-config";
import { Redis } from "@upstash/redis";
import { EDGE_WRITE } from "./endpoints.js";

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
    newUser: async function (userid, order = null, attempt = null) {
        return await redis.json.set(this._prefix.user + userid, "$", {
            attempts: attempt === null ? [] : [attempt],
            order: order
        });
    },
    setOrder: async function (userid, order) {
        return await redis.json.set(this._prefix.user + userid, "$.order", order);
    },
    newAttempt: async function (userid, attempt) {
        return await redis.json.arrappend(this._prefix.user + userid, "$.attempts", attempt);
    },
    getUser: async function (userid) { // json makes this a single call, so not wasteful to get everything here all the time...
        return await redis.json.get(this._prefix.user + userid, "$")?.[0];
    },
    // Channel related data
    channelExists: async function (channelid) {
        return Object.keys(await this.getChannels()).includes(String(channelid));
    },
    getChannels: async function () {
        return await redis.json.get(this._prefix.channel, "$")?.[0];
    },
    getChannel: async function (channelid) {
        return await redis.json.get(this._prefix.channel, `$.${channelid}`)?.[0];
    },
    newChannel: async function (channelid, userid, username, useravatar) {
        return await redis.json.set(this._prefix.channel, `$.${channelid}`, {
            message: null,
            participants: {
                [userid]: {
                    name: username,
                    avatar: useravatar
                }
            }
        });
    },
    setChannelUser: async function (channelid, userid, username, useravatar) {
        return await redis.json.set(this._prefix.channel, `$.${channelid}.participants.${userid}`, {
            name: username,
            avatar: useravatar
        });
    },
    setChannelMessage: async function (channelid, messageid) {
        return await redis.json.set(this._prefix.channel, `$.${channelid}.message`, messageid);
    }
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
