sed -i "s|<!--BUILD_ID-->|"$VERCEL_GIT_COMMIT_SHA"|g" client/index.html
sed -i "s|<!--BUILD_ID_SHORT-->|"${VERCEL_GIT_COMMIT_SHA:0:7}"|g" client/index.html