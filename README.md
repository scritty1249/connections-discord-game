# connections-discord-game
A remake of the NYT Connections game as a Discord Activity using disgusting methods

[Discord bot installation link](https://discord.com/oauth2/authorize?client_id=1475691781071831210)\


## Known bugs
- ~~Does not alwasy retrieve new game data at the start of a new day- cron job execution time should be updated. Tried 12:00am, 12:05am~~
    - Cron jobs run in UTC- timezone not configurable. Offset added for PST, but this won't account for daylight savings
- Submit button does not always appear on certain, smaller screen sizes (iPhone SE 2022)