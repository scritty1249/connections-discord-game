import { authenticate, CLIENT_ID } from "../lib/discord.js";

export async function POST(req) {
    const { code: clientCode }  = await req.json();
    if (!clientCode) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const accessToken = await authenticate(clientCode);
            return Response.json({token: accessToken});
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}

export async function GET(req) {
    try {
        return Response.json({client_id: CLIENT_ID});
    } catch (err) {
        console.error("Environment variable error:", err);
        return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
    }
}