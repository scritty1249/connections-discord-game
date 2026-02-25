import { fetchGameData, storeGameData, wipeAttempts } from "../lib/server.js"

export default async function handler(req, res) {
    try {
        const data = await fetchGameData(new Date());
        console.log(await storeGameData(data));
        console.log("Saved gamedata successfully");
        await wipeAttempts();
        console.log("Cleared userdata successfully");
        res.status(200).json({status: "OK"});
    } catch (err) {
        console.error("Execution error:", err);
        res
            .status(500)
            .json({ error: err.message });
    }
}
