// import { get, getAll, has, del, set, setAll } from '@vercel/edge-config';
import * as Edge from "@vercel/edge-config";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const GAMEDATA_KEY = "gamedata";

// [!] TODO: determine if quota limits will allow for logging. If so, implement at THIS LAYER.
export const UserDB = {
    _prefix: "U_",
    drop: async function () { // deletes ALL ENTRIES.
        return await redis.flushdb();
    },
    exists: async function (userid) {
        return await redis.exists(this._prefix + userid);
    },
    set: async function (userid, value) { // creates and updates
        return await redis.set(this._prefix + userid, value);
    },
    get: async function (userid) {
        return await redis.get(this._prefix + userid);
    }
};

export const GameDB = {
    get: async function () {
        return await Edge.get(GAMEDATA_KEY);
    },
    set: async function (gamedata) {
        return await Edge.set(GAMEDATA_KEY, gamedata);
    }
};
