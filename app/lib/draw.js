// [!] refactor upon function completion

const CANVAS_SIZE = {
    width: 563,
    height: 308
};
const CARD_SIZE = {
    horizontal: {
        width: CANVAS_SIZE.width * .7,
        height: CANVAS_SIZE.height * .85
    },
    vertical: {
        width: (CANVAS_SIZE.width / 4) - ((CANVAS_SIZE.width / 4) / 6),
        height: CANVAS_SIZE.height * .85
    },
    thickness: 2
};
const AVATAR_SIZE = 128;
const COLOR = {
    background: "#151515",
    cardBorder: "#272728"
};

export function createCanvas () {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", String(CANVAS_SIZE.width));
    canvas.setAttribute("height", String(CANVAS_SIZE.height));

    const ctx = canvas.getContext("2d");
    // fill canvas background
    ctx.fillStyle = COLOR.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    

    return { canvas: canvas, ctx: ctx };
}

export async function drawScoreVertical (ctx, position, attempts, userId, avatarName) {
    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarName}.png?size=${AVATAR_SIZE}`;
    return await Promise.all([
        loadImage(avatarUrl)
    ]).then(([
        avatarImg
    ]) => {
        const DIMS = {
            start: {
                x: position.x,
                y: position.y
            },
            end: {
                x: position.x + CARD_SIZE.vertical.width,
                y: position.y + CARD_SIZE.vertical.height
            },
            center: {
                x: position.x + (CARD_SIZE.vertical.width / 2),
                y: position.y + (CARD_SIZE.vertical.height / 2)
            }
        };
        drawCardBorder(ctx, DIMS.start.x, DIMS.start.y, DIMS.end.x, DIMS.end.y);
        drawAvatar(ctx, DIMS.center.x - (AVATAR_SIZE / 2), DIMS.start.y + 10, avatarImg, AVATAR_SIZE);

    });
}

export async function canvasToImage (canvas) {
    return await new Promise((resolve, reject) => {
            try {
                canvas.toBlob(resolve, "image/png");
            } catch (error) {
                reject(error);
            }
    });
}

async function loadImage (src) {
    return await new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
}

function drawAttemptSquare (ctx, x, y, color, size = 50) {
    const ogFillStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, size / 5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = ogFillStyle;
}

function drawAvatar (ctx, x, y, image, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2); // x, y, radius, startAngle, endAngle
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
}

function drawCardBorder (ctx, x, y, width, height) {
    const ogStrokeStyle = ctx.strokeStyle;
    const ogLineWidth = ctx.lineWidth;
    ctx.strokeStyle = COLOR.cardBorder;
    ctx.lineWidth = CARD_SIZE.thickness;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, Math.min(width, height) / 5); 
    ctx.stroke();
    ctx.strokeStyle = ogStrokeStyle;
    ctx.lineWidth = ogLineWidth;
}