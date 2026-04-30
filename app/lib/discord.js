import { DISCORD_AUTH, DISCORD_SEND_MESSAGE_BASE, DISCORD_WEBHOOK_BASE, DISCORD_GET_MESSAGE_BASE } from "./endpoints.js";
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

export async function message (channelId, content, components = []) {
    const url = `${DISCORD_SEND_MESSAGE_BASE}/${channelId}/messages`;
    return await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content: content,
                components: components
            })
        })
        .then((res) => res.ok ? res.json() : null);
}

// gets the id of the most recent message from the bot sent within the same day, or undefined if none exist within the limit.
export async function getChannelMessage (channelid, currentDate) {
    const getUrl = `${DISCORD_GET_MESSAGE_BASE}/${channelid}/messages?limit=${DISCORD_MESSAGE_HISTORY_LIMIT}`;
    const response = await fetch(getUrl, {
        method: "GET",
        headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
        }
    })
    if (!response.ok) return undefined;
    return (await response.json())
        .filter(({type, author, timestamp}) =>
            type === 0  // filter only default messages
            && author?.id == process.env.DISCORD_CLIENT_ID
            && isSameDay(new Date(timestamp), currentDate)
        )?.[0]?.id;
}

// this will attempt to update the message of the id provided. If one is not found, it will send a new message. Returns the id of the message created or updated for chaining.
export async function sendChannelResults (channelid, messageid, usernames, scoreImage) {
    const sendUrl = `${DISCORD_SEND_MESSAGE_BASE}/${channelid}/messages`;
    const updateUrl = `${sendUrl}/${messageid}`;
    const bodyForm = generateScorecardBody(usernames, scoreImage); // setting this as fetch body should set the content-type automatically
    try {
        const response = await fetch(updateUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
            },
            body: bodyForm // 'Content-Type' header is set automatically
        });
        if (response.ok)
            return (await response.json()).id;
        else
            console.warn("Scorecard message update rejected:", await response.json());
    } catch (error) {
        console.warn("Error sending message update to discord:", error);
    }
    const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
        },
        body: bodyForm // 'Content-Type' header is set automatically
    });
    return (await response.json())?.id;
}

function generateScorecardBody (usernames, scoreImage) {
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
                components: [{
                    type: 2,
                    label: "Play now!",
                    style: 1,
                    custom_id: "launch"
                }]
            }
        ]
    };
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
    return null;
}