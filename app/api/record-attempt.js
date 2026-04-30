import { newAttempt, newOrder } from "../lib/server.js";

export async function POST(req) {
    const { searchParams: params } = new URL(req.url);
    const { attempt, order } = await req.json();
    if (!params.has("id") || !attempt) {
        return new Response("Missing required parameter(s).", { status: 400, statusText: "Missing required parameter(s)."});
    } else {
        try {
            const id = params.get("id");
            await newAttempt(id, new Set(attempt));
            if (order) {
                console.info("Order attached to payload");
                await newOrder(id, order);
            }
            return new Response();
        } catch (err) {
            console.error("Vercel API error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}