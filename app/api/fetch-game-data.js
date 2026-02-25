
import { fetchGameData } from "../lib/server.js"

export default async function handler(req, res) {
    try {
        const data = await fetchGameData(new Date());
        res.status(200).json(data);
    } catch (err) {
        console.error("Fetch error:", err);
        res
            .status(500)
            .json({ error: err.message });
    }
}

