// Handlers for various discord interactions (commands)

import { DISCORD_WEBHOOK_BASE } from "./endpoints";

const interactionMessageURI = (interactionToken) => `${DISCORD_WEBHOOK_BASE}/${interactionToken}/messages/@original`;

async function updateDeferredResponse (content, token) {
    return fetch(interactionMessageURI(token), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content })
    });
}

function deferResponse(ephemeral = true) {
    return Response.json({
        type: 5,
        data: ephemeral ? {
            flags: 64 // message is ephemeral- only visible to invoker
        } : {}
    });
}

export function launch () {
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

export const adminTools = { // responses only meant for commands invoked by (project-defined) admins
    "refresh-gamestate": async function (token, success) { // triggers the refresh-gamestate cron job
    },
    "nuke-userdata": async function (token, success) { // wipes all userdata, everywhere
        return updateDeferredResponse(success ? "Cleared all userdata." : "Operation failed!", token);
    },
    "drop-userdata": async function (token, success) { // drops a specific user's data from the database
    },
};