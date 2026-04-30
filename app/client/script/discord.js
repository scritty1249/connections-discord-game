import { DiscordSDK, RPCCloseCodes } from "@discord/embedded-app-sdk";

export const INTERACTION_TIMEOUT_S = 15 * 60;

export const AVATAR_URL = (userid, avatar, sizepx = 128) => `https://cdn.discordapp.com/avatars/${userid}/${avatar}.png?size=${sizepx}`;

export function createCloseTimeout (discordSdk, retryMs = 1000) {
    const close = () => discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "Interaction limit exceeded.");
    return setTimeout(() => {
        if (discordSdk === null && retryMs) setInterval(() => { if (discordSdk !== null) close() }, retryMs);
        else close();
    }, INTERACTION_TIMEOUT_S * 1000);
}

export async function getClient (serverEndpoint) {
    return await fetch(serverEndpoint, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    }).then(resp => {
        if (!resp.ok)
            throw new Error("Failed to retrieve discord client id from server");
        return resp.json();  
    }).then(
        ({ client_id }) => client_id);
}

export async function initSdk (client_id, serverEndpoint) {
    const discordSdk = new DiscordSDK(client_id);
    await discordSdk.ready();
    console.info("Discord SDK ready");
    const { code: clientCode } = await discordSdk.commands.authorize({
        client_id: client_id,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
            "applications.commands"
        ],
    }); 

  const response = await fetch(serverEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: clientCode }),
    });
    const { token } = await response.json();

    if (!token) {
        throw new Error("Discord authentication failed");
    }

    const auth = await discordSdk.commands.authenticate({ access_token: token });

    if (auth === null) {
        throw new Error("Discord authentication failed");
    }

    return {discordSdk: discordSdk, user: auth?.user};
}
