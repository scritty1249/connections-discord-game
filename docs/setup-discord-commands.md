
Getting the default entry command ID
```
curl -X GET "https://discord.com/api/v10/applications/<APPLICATION ID>/commands" \
  -H "Authorization: Bot <BOT TOKEN HERE>" \
  -H "Content-Type: application/json"
```
Overriding the default entry command\
*setting handler to 1 instead of 2 (default) gives the application control of the activity launch flow, instead of the default discord flow*
```
curl -X PATCH "https://discord.com/api/v10/applications/<APPLICATION ID>/commands/<DEFAULT ENTRY COMMAND ID>" \
  -H "Authorization: Bot <BOT TOKEN HERE>" \
  -H "Content-Type: application/json" \
  -d '{"handler":1}'
```