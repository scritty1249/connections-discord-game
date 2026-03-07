import { verifyDiscordRequest } from "../lib/server.js";

export async function POST(req) {
    try {
        const reqRawBody = await req.text();
        const reqHeaders = req.headers;
        const isVerified = verifyDiscordRequest(reqHeaders, reqRawBody);
        if (!isVerified) {
            console.info("Recieved an invalid interaction request"); // discord will purposefully send invalid requests to test the endpoint periodically
            return new Response("invalid request signature", {status: 401}); // specified by discord api guidelines
        }
        const { type, data } = JSON.parse(reqRawBody); // body should be JSON, should this should never fail...
        switch (type) {
            case 2: // APPLICATION COMMAND
            // [!] holy aids nested switch, clean this up later...
                switch (data?.type) { // shouldn't be null
                    case 4: // PRIMARY ENTRY POINT
                        switch (data?.name?.toLowerCase()) {
                            case "launch":
                                return Response.json({
                                    type: 12,
                                    data: {
                                        flags: 4 // send as silent message
                                    }
                                });
                        };
                };
            case 1: // PING
            default:
                return Response.json({type: 1}); // ACK/PONG
        };
    } catch (err) {
        console.error("Execution error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}