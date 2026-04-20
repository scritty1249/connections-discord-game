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

export async function sendScorecard (channelId, scoreImage) {
    const url = `${DISCORD_MESSAGE_BASE}/${channelId}/messages`;
    const form = new FormData();

    // 1. Prepare JSON Payload
    const payload = {
        content: "Test",
        attachments: [{
            "id": 0,
            "description": "Illustration of challenge results",
            "filename": "scorecard.png"
        }]
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
        
        if (response.ok) {
            const result = await response.json();
            console.log("Success:", result);
            return result;
        } else {
            console.warn("Message error.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}