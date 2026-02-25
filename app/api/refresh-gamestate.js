import { fetchGameData, storeGameData, wipeAttempts } from "../lib/server.js"

export default async function handler(req, res) {
    try {
        const data = await fetchGameData(new Date());
        console.debug(data);
        console.info("Fetched gamedata");
        console.debug(await storeGameData(data));
        console.info("Saved gamedata");
        await wipeAttempts();
        console.log("Cleared userdata");
        res.status(200).json({status: "OK"});
    } catch (err) {
        console.error("Execution error:", err);
        res
            .status(500)
            .json({ error: err.message });
    }
}
