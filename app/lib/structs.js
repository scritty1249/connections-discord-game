export const Snowflake = (id) => // upstash redis json tries to serialize this as an Integer to save space, but snowflake IDs exceed the maximum bitsize as an int- causing them to end in "00" instead of their normal values.
    typeof id != "string"
    && id !== null
    ? id === undefined
        ? null
        : JSON.stringify(id)
    : id

export const Token = (id = null, timestamp = null) => ({
    id: Snowflake(id),
    stamp: timestamp,
});

export const Participant = (userid, username, avatarFilename) => ({
    id: Snowflake(userid),
    name: username,
    avatar: avatarFilename,
    equals(other) { return (
        this.id == other?.id && this.name == other?.name && this.avatar == other?.avatar
    )},
    toJSON() { return {
        name: this.name,
        avatar: this.avatar,
    }}
});

export const ParticipantCardData = (
    userid,
    avatarFilename,
    attempts = [],
    categoryStats = {
        total: null,
        "1": null,
        "2": null,
        "3": null,
        "4": null
    }
) => ({
    id: Snowflake(userid),
    avatar: avatarFilename,
    attempts: attempts,
    stats: categoryStats
});

export const User = (userid = null, attempts = [], order = null) => ({
    id: Snowflake(userid),
    attempts: attempts,
    order: order,
    toJSON() { return {
        attempts: this.attempts,
        order: this.order
    }}
});

export const Channel = (channeldata) => ({ // for deserialization
    tok: {
        recent: Token(
            Snowflake(channeldata?.tok?.recent?.id),
            channeldata?.tok?.recent?.stamp 
        ),
        msg: Token(
            Snowflake(channeldata?.tok?.msg?.id),
            channeldata?.tok?.msg?.stamp 
        ),
    },
    msg: Token(
        Snowflake(channeldata?.msg?.id),
        channeldata?.msg?.stamp
    ),
    participants: channeldata?.participants
        ? Object.fromEntries(Array.from(Object.entries(
            channeldata.participants),
            ([id, { name, avatar }]) => [id, Participant(id, name, avatar)]))
        : {}
});
