// [!] refactor upon function completion

const CANVAS_SIZE = {
    width: 563,
    height: 308
};
const CARD_SIZE = {
    horizontal: {
        width: CANVAS_SIZE.width * .7,
        height: CANVAS_SIZE.height * .85,
        gap: 15
    },
    vertical: {
        width: (CANVAS_SIZE.width / 4) - ((CANVAS_SIZE.width / 4) / 6),
        height: CANVAS_SIZE.height * .85,
        gap: 10
    },
    thickness: 2
};
const AVATAR_SIZE = {
    horizontal: 128,
    vertical: 64  
};
const ATTEMPT_SQUARE = {
    horizontal: {
        size: 50,
        gap: 5
    },
    vertical: {
        size: 25,
        gap: 2
    }
};
const COLOR = {
    background: "#151515",
    cardBorder: "#272728",
    "category-0": "#f7Da21",
    "category-1": "#b5e352",
    "category-2": "#00a2b3",
    "category-3": "#a354a8"
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
    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarName}.png?size=${AVATAR_SIZE.vertical}`;
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
        let currY = DIMS.start.y + CARD_SIZE.vertical.gap;
        drawCardBorder(ctx, DIMS.start.x, DIMS.start.y, DIMS.end.x - DIMS.start.x, DIMS.end.y - DIMS.start.y);
        drawAvatar(ctx, DIMS.center.x - (AVATAR_SIZE.vertical / 2), currY, avatarImg, AVATAR_SIZE.vertical);
        currY += AVATAR_SIZE.vertical + CARD_SIZE.vertical.gap;
        drawAttemptGridVertical(ctx,
            DIMS.center.x - (((ATTEMPT_SQUARE.vertical.gap * 3) + (ATTEMPT_SQUARE.vertical.size * 4)) / 2),
            currY,
            attempts ? attempts : [] // [!] (self) idiot-proofing
        ); 
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

function drawAttemptSquare (ctx, x, y, color, size) {
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

function drawAttemptGridVertical (ctx, x, y, attemptCategories) { // attemptCategories here is an Array of attempts, where each attempt is an Array of Numbers that corrospond to a specific category (0-3).
    const attempts = Object.assign(new Array(6).fill([-1, -1, -1, -1]), attemptCategories.slice(-6));
    attempts.forEach((attempt, row) => {
        const offsetY = row * (ATTEMPT_SQUARE.vertical.gap + ATTEMPT_SQUARE.vertical.size);
        attempt.forEach((category, col) => {
            const offsetX = col * (ATTEMPT_SQUARE.vertical.gap + ATTEMPT_SQUARE.vertical.size);
            if (category === -1)
                drawCardBorder(ctx, x + offsetX, y + offsetY, ATTEMPT_SQUARE.vertical.size, ATTEMPT_SQUARE.vertical.size);
            else
                drawAttemptSquare(ctx, x + offsetX, y + offsetY, COLOR[`category-${category}`], ATTEMPT_SQUARE.vertical.size);
        });
    });
}