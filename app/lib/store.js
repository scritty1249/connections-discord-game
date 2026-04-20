// import { get, getAll, has, del, set, setAll } from '@vercel/edge-config';
import * as Edge from "@vercel/edge-config";
import { Redis } from "@upstash/redis";
import { EDGE_WRITE } from "./endpoints.js";

const redis = Redis.fromEnv();
const GAMEDATA_KEY = "gamedata";
const CHANNELS_KEY = "channels";
const ADM_LIST_KEY = "admins";

// [!] TODO: determine if quota limits will allow for logging. If so, implement at THIS LAYER.
export const UserDB = {
    _prefix: {
        attempts: "A_",
        order: "O_"
    },
    drop: async function () { // deletes ALL ENTRIES.
        try {
            await redis.flushdb();
            return true;
        } catch (error) {
            console.error("UserDB Flush failed!", error);
            return false;
        }
    },
    exists: async function (userid, type) {
        return await redis.exists(this._prefix[type] + userid);
    },
    set: async function (userid, type, value) { // creates and updates
        return await redis.set(this._prefix[type] + userid, value);
    },
    get: async function (userid, type, fallback = null) {
        return await redis.get(this._prefix[type] + userid)
            .then((value) => value === null ? fallback : value);
    },
    getlist: async function (userid, type, fallback = null, start = 0, end = -1) {
        return await redis.lrange(this._prefix[type] + userid, start, end)
            .then((value) => value === null ? fallback : value);
    },
    append: async function (userid, type, ...values) {
        return await redis.rpush(this._prefix[type] + userid, ...values);
    },
    prepend: async function (userid, type, ...values) {
        return await redis.lpush(this._prefix[type] + userid, ...values);
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

export const ChannelsDB = {
    get: async function () {
        return await Edge.get(MESSAGES_KEY);
    },
    set: async function (channelsdata) {
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
                        key: CHANNELS_KEY,
                        value: channelsdata
                    }
                ]
            })
        });
        return await response.json();
    }
};