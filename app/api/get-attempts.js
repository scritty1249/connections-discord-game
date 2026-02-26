import { getAttempts } from "../lib/server.js"

export default async function handler(req, res) {
    const { searchParams: params } = new URL(req.url);
    if (!params.has("id")) {
        res.status(400).json({error: "Missing required parameter(s)."});
    } else {
        try {
            const id = params.get("id");
            const data = await getAttempts(id);
            res.status(200).json(data);
        } catch (err) {
            console.error("Fetch error:", err);
            res
                .status(500)
                .json({ error: err.message });
        }
    }
}

