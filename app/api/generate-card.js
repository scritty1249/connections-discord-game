import { updateChannelParticipants, sendScorecard } from "../lib/server.js"

export async function POST(req) {
    const { userdata, channel, name }  = await req.json();
    if (
        !userdata
        || !channel
        || userdata.userid === undefined
        || userdata.avatar === undefined
        || userdata.attempts === undefined
        || userdata.name === undefined
    ) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const { userid, avatar, attempts, name } = userdata;
            const channeldata = await updateChannelParticipants(channel, userid, name, avatar);
            await sendScorecard(channel);
            return new Response();
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}
