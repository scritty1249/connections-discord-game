import { getGameData } from "../lib/server.js"

export async function GET(req) {
    try {
        const data = await getGameData();
        return Response.json(data);
    } catch (err) {
        console.error("Fetch error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}

