import { isUserAdmin, wipeAttempts, wipeUserAttempts, refreshGamestate, sendScorecard, touchChannel } from "../lib/server.js";
import { verify, INTERACTION } from "../lib/discord.js";
import * as commands from "../lib/interaction-responses.js";
import { promiseTimeout } from "../lib/utils.js";
import { waitUntil } from "@vercel/functions";

export async function POST(req) {
    try {
        // verify interaction
        const body = await req.text();
        const headers = req.headers;
        if (verify(headers, body)) return commands.invalidInteraction();

        const interaction = JSON.parse(body); // body should be JSON, should this should never fail...
        return await parseInteraction(interaction);
    } catch (err) {
        console.error("Execution error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}

async function parseInteraction (interaction) {
    switch (interaction.type) {
        case INTERACTION.TYPE.APPLICATION_COMMAND:
            return await parseCommandInteraction(interaction);
        case INTERACTION.TYPE.MESSAGE_COMPONENT:
            return await parseComponentInteraction(interaction);
        case INTERACTION.TYPE.PING:
        default:
            return commands.acknowledge();
    };
}

async function parseCommandInteraction (interaction) {
    switch (interaction.data?.type) {
        case INTERACTION.COMMAND.CHAT_INPUT:
            return await parseSlashCommand(interaction);
        case INTERACTION.COMMAND.PRIMARY_ENTRY_POINT:
            return await launch(interaction);
        default:
            console.warn("Unknown Application Command Interaction");
            console.dir(interaction);
    };
}

async function parseComponentInteraction (interaction) {
    switch (interaction.data?.custom_id?.toLowerCase()) {
        case "launch":
            return await launch(interaction);
        default:
            console.warn("Unknown Message Component Interaction");
            console.dir(interaction);
    };
}

async function parseSlashCommand (interaction) {
    const commandName = interaction.data?.name?.toLowerCase();
    switch (interaction.context) {
        case INTERACTION.CONTEXT.BOT_DM:
            switch (commandName) {
                case "api":
                    await parseApiCommand(interaction);
                    return commands.deferResponse(false);
                case "amiadmin":
                    return commands.messageResponse(
                        (await isUserAdmin(interaction.user ?? interaction.member?.user))
                        ? "Yes"
                        : "No"
                    );
            };
        case INTERACTION.CONTEXT.GUILD:
        case INTERACTION.CONTEXT.PRIVATE_CHANNEL:
            switch (commandName) {
                case "api":
                    await parseApiCommand(interaction);
                    return commands.deferResponse(true);
            };
        default:
            console.warn("Invalid Slash Command Interaction");
            console.dir(interaction);
    };
}

async function parseApiCommand (interaction) {
    const { token } = interaction;
    const user = interaction.user ?? interaction.member?.user;
    console.info("API command invoked from discord");
    waitUntil(
        promiseTimeout(3000)// [!] unga bunga solution to ensuring waitUntil fires after the response...
        .then(() => isUserAdmin(user?.id))
        .then(async (isAdmin) => {
            if (isAdmin)
                await executeApiCommand(interaction);
            else
                await commands.updateDeferredResponse("Invalid context to use this command.", token);
        }).then(() => console.debug("Queue execution finished.")
        ).catch(async (error) => {
            console.error(error);
            await commands.updateDeferredResponse("Something went wrong on our side.", token);
        })
    );
}

async function executeApiCommand (interaction) {
    // api subcommand interactions should include an option field
    const command = interaction.data?.options?.[0];
    const commandName = command?.name?.toLowerCase();
    const { token } = interaction;
    switch (commandName) {
        case "nuke-userdata":
            await wipeAttempts()
                .then((success) => commands.adminTools["nuke-userdata"](token, success))
                .finally(() => console.info("Invoked: nuke-userdata"))
        break;
        case "refresh-gamestate":
            await refreshGamestate()
                .then((success) => commands.adminTools["refresh-gamestate"](token, success))
                .finally(() => console.info("Invoked: refresh-gamestate"))
        break;
        case "drop-userdata":
            const targetUserid = command?.options?.[0]?.value;
            await wipeUserAttempts(targetUserid)
                .then((success) => commands.adminTools["drop-userdata"](token, success, targetUserid))
                .finally(() => console.info("Invoked: drop-userdata"));
        break;
        default:
            await commands.updateDeferredResponse(`Command '${commandName}' not recognized!`, token);
    };
}

// commands

// doesn't create channel if context is DM
async function launch (interaction) {
    const { channel_id, token, context } = interaction;
    if (context !== 1) // invoked in server or group dm
        waitUntil(touchChannel(channel_id, token));
    return commands.launch();
}