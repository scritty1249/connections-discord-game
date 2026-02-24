import { fetchGameData } from "/lib/server.js"

export default async function handler(req, res) {
    try {
        const data = await fetchGameData(new Date())
        res.status(200).json(data)
    } catch (error) {
        console.error("Fetch error:", error)
        response
            .status(500)
            .json({ message: "Error fetching data from external resource" })
    }
}
