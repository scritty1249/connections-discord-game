import { fetchGameData, storeGameData, wipeAttempts } from "../lib/server.js"

export async function GET(req) {
    try {
        const data = await fetchGameData(new Date());
        console.debug(data);
        console.info("Fetched gamedata");
        console.debug(await storeGameData(data));
        console.info("Saved gamedata");
        await wipeAttempts();
        console.log("Cleared userdata");
        return new Response();
    } catch (err) {
        console.error("Execution error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}
