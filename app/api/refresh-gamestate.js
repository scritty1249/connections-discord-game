import { fetchGameData, storeGameData, wipeAttempts } from "../lib/server.js"

export default async function handler(req, res) {
    try {
        const data = await fetchGameData(new Date());
        await storeGameData(data);
        console.log("Saved gamedata successfully");
        await wipeAttempts();
        console.log("Cleared userdata successfully");
        res.status(200);
    } catch (err) {
        console.error("Execution error:", err);
        res
            .status(500)
            .json({ message: err.message });
    }
}
