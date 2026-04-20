import { scoreImage } from "../lib/server.js"
import { sendScorecard } from "../lib/discord.js";

export async function POST(req) {
    const { userdata, channel, name }  = await req.json();
    if (
        !userdata
        || !channel
        || !userdata.length
        || userdata.some(d => d?.userid === undefined)
        || userdata.some(d => d?.avatar === undefined)
        || userdata.some(d => d?.attempts === undefined)
        || userdata.some(d => d?.name === undefined)
    ) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const imgBlob = await scoreImage(...userdata);
            const respJson = await sendScorecard(channel, Array.from(userdata, d => d.name), imgBlob);
            console.debug(respJson);
            return new Response();
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}