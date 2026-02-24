import { dateToString } from "./utils.js";
import * as ENDPOINT from "./endpoints.js";

export async function fetchGameData(gameDate) {
    const endpoint = ENDPOINT.GAME_DATA + dateToString(gameDate) + ".json"
    const request = new Request(endpoint, { credentials: "include" });
    const response = await fetch(request);
    if (response.status !== "OK")
        throw new Error(`Something went wrong while requesting game data from NYT servers. Status: ${response.status}`);
    const data = response.categories;
    const categories = {};
    data.forEach(({title, cards}) => categories[title] = Array.from(cards, c => c.content)); // don't care about preserving card location/order
    return categories;
}