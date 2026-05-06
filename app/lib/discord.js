import { DISCORD_AUTH, DISCORD_WEBHOOK_BASE, DISCORD_API_BASE } from "./endpoints.js";
import { default as nacl } from "tweetnacl";
import { isSameDay, unixTimestamp } from "./utils.js";

const DISCORD_MESSAGE_HISTORY_LIMIT = 50; // max number of messages to retrieve when searching for previous messages
const DISCORD_INTERACTION_TOKEN_DURATION_S = 15* 60; // time limit of interation tokens, in seconds (15 minutes)

export const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

export const INTERACTION = { // [!] may be excessive but i am tired of hardcoding these while keeping the docs open on a second window
    TYPE: { // https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-interaction-type
        PING: 1,
        APPLICATION_COMMAND: 2,
        MESSAGE_COMPONENT: 3,
        APPLICATION_COMMAND_AUTOCOMPLETE: 4,
        MODAL_SUBMIT: 5
    },
    CONTEXT: { // https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-object-interaction-context-types
        GUILD: 0, // server
        BOT_DM: 1, // DMing the bot directly
        PRIVATE_CHANNEL: 2, // any DM or Group DM that does not have the bot in it
    },
    COMMAND: { // https://docs.discord.com/developers/interactions/application-commands#application-command-object-application-command-types
        CHAT_INPUT: 1, // slash "/" commands
        USER: 2,
        MESSAGE: 3,
        PRIMARY_ENTRY_POINT: 4 // launch command
    }
};

export function isTokenValid(token, date = new Date()) { // does not check if either date is in the future
    return token?.stamp
    ? unixTimestamp(date) - token.stamp <= DISCORD_INTERACTION_TOKEN_DURATION_S
    : false;
}

export async function authenticate (clientCode) {
    const response = await fetch(DISCORD_AUTH, {
        method: "POST",
        headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code: clientCode,
        }),
    });
    const { access_token } = await response.json();
    return access_token;
}

export function verify (requestHeaders, requestBodyStr) {
    const sig = requestHeaders?.get("X-Signature-Ed25519");
    const stamp = requestHeaders?.get("X-Signature-Timestamp");
    const body = requestBodyStr; // raw body should be a str, not bytes

    return nacl.sign.detached.verify(
        // Buffers are Nodejs things, since vercel's Uint8Array.fromHex isn't fucking working
        Buffer.from(stamp + body),
        Buffer.from(sig, "hex"),
        Buffer.from(process.env.DISCORD_PUBLIC_KEY, "hex")
    );
}

export function generateScorecardBody (usernames, scoreImage, silent = false) {
    const form = new FormData();
    const names = usernames.length == 1
        ? usernames[0]
        : usernames.length == 2
        ? `${usernames[0]} and ${usernames[1]}`
        : usernames.slice(0, -1).join(", ") + " and " + usernames.at(-1);

    const payload = {
        content: `${names} ${usernames.length > 1 ? "were" : "was"} playing`,
        attachments: [{
            "id": 0,
            "description": "Illustration of challenge results",
            "filename": "scorecard.png"
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: "Play now!",
                        style: 1,
                        custom_id: "launch"
                    }
                ]
            }
        ]
    };
    if (silent)
        payload.flags = 4096; // suppress notifications
    form.append("payload_json", JSON.stringify(payload));
    form.append("files[0]", scoreImage, "scorecard.png");
    return form;
}

// not the same as an interaction response. This is a "followup message" for an interaction. Limit is 5 per interaction when called in guilds that the app is not installed in.
// https://docs.discord.com/developers/interactions/receiving-and-responding#create-followup-message
export async function sendInterationMessage (token, messageBody) { 
    const url = `${DISCORD_WEBHOOK_BASE}/${token}?wait=true`;
    const response = await fetch(url, {
        method: "POST",
        body: messageBody
    });
    if (response.ok)
        return await response.json();
    console.dir(await response.json(), { depth: null });
    return null;
}

export async function editInteractionMessage(token, messageid, messageBody) {
    const url = `${DISCORD_WEBHOOK_BASE}/${token}/messages/${messageid}`;
    const response = await fetch(url, {
        method: "PATCH",
        body: messageBody
    });
    if (response.ok)
        return await response.json();
    console.dir(await response.json(), { depth: null });
    return null;
}
