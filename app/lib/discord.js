import { DISCORD_AUTH, DISCORD_MESSAGE_BASE, DISCORD_WEBHOOK_BASE } from "./endpoints.js";
import { default as nacl } from "tweetnacl";

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
    const url = `${DISCORD_MESSAGE_BASE}/${channelId}/messages`;
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

export async function sendScorecard (channelId, usernames, scoreImage) {
    const url = `${DISCORD_MESSAGE_BASE}/${channelId}/messages`;
    const form = new FormData();
    const names = usernames.length == 1
        ? usernames[0]
        : usernames.length == 2
        ? `${usernames[0]} and ${usernames[0]}`
        : usernames.slice(0, -2).join(", ") + " and " + usernames.at(-1);

    // 1. Prepare JSON Payload
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

    // 2. Append File
    form.append("files[0]", scoreImage, "scorecard.png");

    // 3. Send Request
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
            },
            body: form // 'Content-Type' header is set automatically
        });
        const okay = response.ok;
        const result = await response.json();
        if (okay) {
            return result;
        } else {
            console.warn("Message error:", result);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}