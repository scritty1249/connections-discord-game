sed -i "s|<!--BUILD_ID-->|"$VERCEL_GIT_COMMIT_SHA"|g" client/index.html
