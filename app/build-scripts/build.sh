mkdir -p public/stylesheets
cp client/index.html public/index.html
for file in client/stylesheets/*.css; do
    filename=$(basename "$file" .css)
    cp "$file" "public/stylesheets/${filename}-$VERCEL_GIT_COMMIT_SHA.css"
done
esbuild client/script/main.js --bundle --minify --outfile="public/script/bundle-"$VERCEL_GIT_COMMIT_SHA".js"