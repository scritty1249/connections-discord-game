import { addChannelParticipant } from "../lib/server.js"
import { Participant } from "../lib/structs.js";

export async function POST(req) {
    const { participant, channel }  = await req.json();
    if (
        !participant
        || !channel
        || participant.id === undefined
        || participant.avatar === undefined
        || participant.nick === undefined
    ) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const { id, avatar, nick } = participant;
            const participantData = Participant(id, nick, avatar);
            await addChannelParticipant(channel, participantData);
            return new Response();
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}