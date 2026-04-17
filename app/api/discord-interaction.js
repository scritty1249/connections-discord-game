import { verifyDiscordRequest, isUserAdmin, wipeAttempts } from "../lib/server.js";
import * as commands from "../lib/interaction-responses.js";
import { waitUntil } from "@vercel/functions";

export async function POST(req) {
    try {
        const reqRawBody = await req.text();
        const reqHeaders = req.headers;
        const isVerified = verifyDiscordRequest(reqHeaders, reqRawBody);
        if (!isVerified) {
            console.info("Recieved an invalid interaction request"); // discord will purposefully send invalid requests to test the endpoint periodically
            return new Response("invalid request signature", {status: 401}); // specified by discord api guidelines
        }
        const requestBody = JSON.parse(reqRawBody); // body should be JSON, should this should never fail...
        console.debug(requestBody);
        const { type, user, token } = requestBody;
        const commandName = data?.name?.toLowerCase();
        switch (type) {
            case 2: // APPLICATION COMMAND
            const { data } = requestBody;
            // [!] holy aids nested switch, clean this up later...
                switch (data?.type) { // shouldn't be null
                    case 1: // chat command, usually a slash command
                        case 0: // Invoked in server
                        break;
                        case 1: // DM with the bot only
                            switch (commandName) {
                                case "api":
                                    // api subcommand interactions should include an option field
                                    const { options } = data;
                                    console.info("API command invoked from discord");
                                    waitUntil(
                                        isUserAdmin(user?.id)
                                        .then((isAdmin) => {
                                            if (isAdmin) {
                                                switch (options?.name.toLowerCase()) {
                                                    case "nuke-userdata":
                                                        wipeAttempts().then((success) =>
                                                            commands.adminTools["nuke-userdata"](token, success));
                                                    break;
                                                };
                                            } else {
                                                commands.updateDeferredResponse("Invalid context to use this command.", token);
                                            }
                                        })
                                    );
                                    return commands.deferResponse(true);
                                case "amiadmin":
                                    const isAdmin = await isUserAdmin(user?.id);
                                    return commands.messageResponse(isAdmin ? "Yes" : "No");
                            };
                        break;
                        case 2: // DM or group DM, does not need bot user to be a member
                        break;
                    case 4: // PRIMARY ENTRY POINT
                        switch (commandName) {
                            case "launch": return commands.launch();
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