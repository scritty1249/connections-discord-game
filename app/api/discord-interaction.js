import { verifyDiscordRequest } from "../lib/server";

export async function POST(req) {
    const { type, data } = await req.json();
    if (!verifyDiscordRequest(req)) return new Response(null, {status: 401}); // specified by discord api guidelines
    switch (type) {
        case 2: // APPLICATION COMMAND
        // [!] holy aids nested switch, clean this up later...
            switch (data?.type) { // shouldn't be null
                case 4: // PRIMARY ENTRY POINT
                    switch (data?.name?.toLowerCase()) {
                        case "launch":
                            return Response.json({type: 12});
                    };
            };
        case 1: // PING
        default:
            return Response.json({type: 1}); // ACK/PONG
    };
}