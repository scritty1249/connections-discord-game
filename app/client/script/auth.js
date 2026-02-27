// import { DiscordSDK } from "@discord/embedded-app-sdk";

export async function initDiscordSdk (server_api_endpoint) {
    const discordSdk = new DiscordSDK(process.env.DISCORD_CLIENT_ID);
    await discordSdk.ready();
    console.info("Discord SDK ready");
    const { code: clientCode } = await discordSdk.commands.authorize({
        client_id: process.env.DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
            "applications.commands"
        ],
    }); 

  const response = await fetch(server_api_endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientCode }),
    });
    const { token } = await response.json();

    auth = await discordSdk.commands.authenticate({ access_token });

    if (auth == null) {
        throw new Error("Discord authentication failed");
    }

    return {discordSdk: discordSdk, user: auth?.user};
}