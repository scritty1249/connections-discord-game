import { DISCORD_AUTH } from "../lib/endpoints.js"

export async function POST(req) {
    if (!req.body?.code) {
        return new Response(null, {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const response = await fetch(DISCORD_AUTH, {
                method: "POST",
                headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret: process.env.DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code: req.body.code,
                }),
            });
            const { access_token } = await response.json();
            return Response.json({token: access_token});
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}

export async function GET(req) {
    try {
        return Response.json({client_id: process.env.DISCORD_CLIENT_ID});
    } catch (err) {
        console.error("Environment variable error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}