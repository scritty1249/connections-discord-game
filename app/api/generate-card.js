import { scoreImage, getChannelsData, updateChannelParticipants, getAttempts, setChannelsData } from "../lib/server.js"
import { sendChannelResults, getChannelMessage } from "../lib/discord.js";

export async function POST(req) {
    const { userdata, channel, name }  = await req.json();
    if (
        !userdata
        || !channel
        || userdata.userid === undefined
        || userdata.avatar === undefined
        || userdata.attempts === undefined
        || userdata.name === undefined
    ) {
        return new Response("Missing required payload.", {status: 400, statusText: "Missing required payload."});
    } else {
        try {
            const { userid, avatar, attempts, name } = userdata;
            await updateChannelParticipants(channel, userid, name, avatar);
            const channelsdata = await getChannelsData();
            const channeldata = channelsdata[channel];
            const messageid = channeldata.message === null ? await getChannelMessage(channel, new Date()) : channeldata.message;
            const usernames = [];
            const userdatas = await Promise.all(Array.from(Object.keys(channeldata.participants), async (participant) => {
                const participantattempts = participant == userid ? attempts : await getAttempts(participant);
                usernames.push(channeldata.participants[participant].name);
                return {
                    attempts: participantattempts,
                    avatar: channeldata.participants[participant].avatar,
                    userid: participant
                };
            }));

            const imgBlob = await scoreImage(...userdatas);
            channeldata.message = await sendChannelResults(channel, usernames, imgBlob);
            channelsdata[channel] = channeldata;
            await setChannelsData(channelsdata);
            return new Response();
        } catch (err) {
            console.error("Fetch error:", err);
            return Response.json({error: err.message}, {status: 500, statusText: "Internal server error"});
        }
    }
}