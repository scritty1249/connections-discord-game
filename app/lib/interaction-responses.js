// Handlers for various discord interactions (commands)

import { DISCORD_WEBHOOK_BASE } from "./endpoints.js";

const interactionMessageURI = (interactionToken) => `${DISCORD_WEBHOOK_BASE}/${interactionToken}/messages/@original`;

export async function updateDeferredResponse (content, token) {
    return await fetch(interactionMessageURI(token), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content })
    }).then(response => {
        console.debug(`Response deferred for interaction ${token}`);
        return response;
    });
}

export function deferResponse(ephemeral = true) {
    console.debug("Deferred response");
    return Response.json({
        type: 5,
        data: {
            flags: ephemeral ? 64 : 0 // message is ephemeral- only visible to invoker
        }
    });
}

export function launch () {
    console.debug("Application launched");
    return Response.json({
        type: 12,
        data: {
            flags: 4 // send as silent message
        }
    });
}

export function invalidContext() { // tried to invoke an admin tool without being on the admin list
    return Response.json({
        type: 4, // response with message
        data: {
            content: "Invalid context to use this command.",
            flags: 4 // suppress notifs
        }
    });
}

export function messageResponse(content, ephemeral = true) {
    return Response.json({
        type: 4,
        data: {
            content: content,
            flags: ephemeral ? 80 : 16 // notificaitons suppressed, 1 << 4
        }
    });
}

export const adminTools = { // responses only meant for commands invoked by (project-defined) admins
    "refresh-gamestate": async function (token, success) { // triggers the refresh-gamestate cron job
        return await updateDeferredResponse(success ? "Refreshed game data." : "Operation failed!", token);
    },
    "nuke-userdata": async function (token, success) { // wipes all userdata, everywhere
        return await updateDeferredResponse(success ? "Cleared all userdata." : "Operation failed!", token);
    },
    "drop-userdata": async function (token, success, userid) { // drops a specific user's data from the database
        return await updateDeferredResponse(success ? `Cleared userdata for <@${userid}>.` : `Operation failed! Has user <@${userid}> made any attempts yet?`, token);
    },
};