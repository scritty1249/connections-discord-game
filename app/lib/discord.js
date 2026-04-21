import { DISCORD_AUTH, DISCORD_SEND_MESSAGE_BASE, DISCORD_WEBHOOK_BASE, DISCORD_GET_MESSAGE_BASE } from "./endpoints.js";
import { default as nacl } from "tweetnacl";
import { isSameDay } from "./utils.js";

const DISCORD_MESSAGE_HISTORY_LIMIT = 50; // max number of messages to retrieve when searching for previous messages

export const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

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
    const resBody = await response.json();
    console.debug(resBody)
    return resBody?.id;
}

function generateScorecardBody (usernames, scoreImage) {
    const form = new FormData();
    const names = usernames.length == 1
        ? usernames[0]
        : usernames.length == 2
        ? `${usernames[0]} and ${usernames[1]}`
        : usernames.slice(0, -2).join(", ") + " and " + usernames.at(-1);

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
