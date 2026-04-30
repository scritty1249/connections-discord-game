import { addChannelParticipant, replyScorecard } from "../lib/server.js"
import { Participant } from "../lib/structs.js";

export async function POST(req) {
    const { channel }  = await req.json();
    if (!channel) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            await replyScorecard(channel);
            return new Response();
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}
