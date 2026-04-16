# Overriding the default entry point command (slash command)
Getting the default entry command ID
```
curl -X GET "https://discord.com/api/v10/applications/<APPLICATION_ID>/commands" \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json"
```
Overriding the default entry command\
*setting handler to 1 instead of 2 (default) gives the application control of the activity launch flow, instead of the default discord flow*
```
curl -X PATCH "https://discord.com/api/v10/applications/<APPLICATION_ID>/commands/<DEFAULT_ENTRY_COMMAND_ID>" \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"handler":1}'
```

# Adding debug api invocations

```
curl -X POST "https://discord.com/api/v10/applications/<APPLICATION_ID>/commands" \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "api", "description": "API function invocations for testing", "options": [ {"name": "nuke-userdata", "description": "Clear all stored user data, everywhere", "type": 1}, {"name": "refresh-gamestate", "description": "Clears all userdata and retrieves new gamedata", "type": 1}, {"name": "drop-userdata", "description": "Clears a specific user\'s data", "type": 1, "options": [ {"name": "user", "description": "The user to drop data for", "type": 6, "required": true} ]} ]}'
```

# Adding debug command, not for api
```
curl -X POST "https://discord.com/api/v10/applications/<APPLICATION_ID>/commands" \
  -H "Authorization: Bot <BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "amiadmin", "description": "Checks if you are registered as an admin for this application", "type": 1}'
```