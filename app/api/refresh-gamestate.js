import { refreshGamestate } from "../lib/server.js"

export async function GET(req) {
    if (await refreshGamestate()) {
        console.info("Refreshed gamestate");
        return new Response();
    }
    else
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
}
