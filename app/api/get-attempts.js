import { getAttempts } from "../lib/server.js"

export async function GET(req) {
    const { searchParams: params } = new URL(req.url);
    if (!params.has("id")) {
        return new Response(null, { status: 400, statusText: "Missing required parameter(s)."});
    } else {
        try {
            const id = params.get("id");
            const data = await getAttempts(id);
            return Response.json(data);
        } catch (err) {
            console.error("Vercel API error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}

