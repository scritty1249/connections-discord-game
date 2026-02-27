import { DiscordSDK } from "@discord/embedded-app-sdk";

export async function getDiscordClient (serverEndpoint) {
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

export async function initDiscordSdk (client_id, serverEndpoint) {
    const discordSdk = new DiscordSDK(client_id);
    await discordSdk.ready();
    console.info("Discord SDK ready");
    const { code } = await discordSdk.commands.authorize({
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
        body: JSON.stringify({ code }),
    });
    const { access_token } = await response.json();

    auth = await discordSdk.commands.authenticate({ access_token });

    if (auth == null) {
        throw new Error("Discord authentication failed");
    }

    return {discordSdk: discordSdk, user: auth?.user};
}