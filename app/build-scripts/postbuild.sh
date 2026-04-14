current_dt=$(TZ="America/Los_Angeles" date +"%-I:%M %p PST, %d/%m/%Y")
curl -X PATCH https://discord.com/api/v10/users/@me \
    -H "Authorization: Bot "$DISCORD_BOT_TOKEN \
    -H "Content-Type: application/json" \
    -d '{"bio": "Last Updated'$current_dt'"}'
