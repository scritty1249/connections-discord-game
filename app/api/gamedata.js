import { fetchGameData } from "/lib/server.js" 

export default async function handler(req, res) {
    const data = await fetchGameData(new Date());
    res.status(200).json(data);
}