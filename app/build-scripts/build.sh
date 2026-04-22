mkdir -p public/stylesheets
cp client/index.html public/index.html
cp -a client/stylesheets/. public/stylesheets/
esbuild client/script/main.js --bundle --minify --outfile="public/script/bundle-"$VERCEL_GIT_COMMIT_SHA".js"