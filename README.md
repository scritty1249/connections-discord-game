# connections-discord-game
A remake of the NYT Connections game as a Discord Activity using disgusting methods

[Discord bot installation link](https://discord.com/oauth2/authorize?client_id=1475691781071831210)
## Known bugs
- Image generation will render cards out of frame if channel participant count exceeds 4.
    - Note: *Unsure if I should just cutoff at 4 participants per image, or implement logic to track the most recent participants. Tracking would dramatically increase the amount of R/W calls to the database.*