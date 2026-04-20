import { isUserAdmin, wipeAttempts, refreshGamestate } from "../lib/server.js";
import { verify } from "../lib/discord.js";
import * as commands from "../lib/interaction-responses.js";
import { promiseTimeout } from "../lib/utils.js";
import { waitUntil } from "@vercel/functions";

export async function POST(req) {
    try {
        const reqRawBody = await req.text();
        const reqHeaders = req.headers;
        const isVerified = verify(reqHeaders, reqRawBody);
        if (!isVerified) {
            console.info("Recieved an invalid interaction request"); // discord will purposefully send invalid requests to test the endpoint periodically
            return new Response("invalid request signature", {status: 401}); // specified by discord api guidelines
        }
        const requestBody = JSON.parse(reqRawBody); // body should be JSON, should this should never fail...
        const { type, user, token } = requestBody;
        switch (type) {
            case 2: // APPLICATION COMMAND
                const { data } = requestBody;
                const commandName = data?.name?.toLowerCase();
                // [!] holy aids nested switch, clean this up later...
                switch (data?.type) { // shouldn't be null
                    case 4: // PRIMARY ENTRY POINT
                        switch (commandName) {
                            case "launch": return commands.launch();
                        };
                    case 1: // chat command, usually a slash command
                        const { context } = requestBody;
                        switch (context) {
                            case 0: // Invoked in server
                            break;
                            case 1: // DM with the bot only
                                switch (commandName) {
                                    case "api":
                                        // api subcommand interactions should include an option field
                                        const { options } = data;
                                        const subCommandName = options?.[0]?.name?.toLowerCase();
                                        console.info("API command invoked from discord");
                                        waitUntil(
                                            promiseTimeout(3000)// [!] unga bunga solution to ensuring waitUntil fires after the response...
                                            .then(() => isUserAdmin(user?.id))
                                            .then(async (isAdmin) => {
                                                if (isAdmin) {
                                                    switch (subCommandName) {
                                                        case "nuke-userdata":
                                                            await wipeAttempts()
                                                                .then((success) => commands.adminTools["nuke-userdata"](token, success))
                                                                .then(() => console.info("Invoked: nuke-userdata"))
                                                        break;
                                                        case "refresh-gamestate":
                                                            await refreshGamestate()
                                                                .then((success) => commands.adminTools["refresh-gamestate"](token, success))
                                                                .then(() => console.info("Invoked: refresh-gamestate"))
                                                        break;
                                                        case "drop-userdata":
                                                            await commands.updateDeferredResponse("Command not yet supported.", token)
                                                                .then(() => console.info("Invoked: drop-userdata (not implemented)"));
                                                        break;
                                                        default:
                                                            await commands.updateDeferredResponse(`Command '${subCommandName}' not recognized!`, token);
                                                    };
                                                } else {
                                                    commands.updateDeferredResponse("Invalid context to use this command.", token);
                                                }
                                            }).then(() => console.debug("Queue execution finished.")
                                            ).catch((error) => {
                                                console.error(error);
                                                commands.updateDeferredResponse("Something went wrong on our side.", token);
                                            })
                                        );
                                        return commands.deferResponse(true);
                                    case "amiadmin":
                                        const isAdmin = await isUserAdmin(user?.id);
                                        return commands.messageResponse(isAdmin ? "Yes" : "No");
                                };
                            break;
                            case 2: // DM or group DM, does not need bot user to be a member
                                return commands.messageResponse("There are currently no supported commands for servers. Message me directly to use commands."); // currently no supported commands for servers.
                            default:
                                return commands.messageResponse("Invalid context to use this command.");
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