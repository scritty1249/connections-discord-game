const DISCORD_API_VERSION = 10;

export const GAME_DATA = "https://www.nytimes.com/svc/connections/v2/"; // vX may be updated in future, will need to be changed
export const EDGE_WRITE = `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.VERCEL_TEAM_ID}`;
export const DISCORD_AUTH = "https://discord.com/api/oauth2/token";
export const DISCORD_API_BASE = `https://discord.com/api/v${DISCORD_API_VERSION}`
export const DISCORD_WEBHOOK_BASE = `${DISCORD_API_BASE}/webhooks/${process.env.DISCORD_CLIENT_ID}`;

