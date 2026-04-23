process.env.FONTCONFIG_PATH = join(process.cwd(), "app", "public", "fonts"); // path to dummy config to silence fontconfig error messages 

import { Canvas, loadImage, FontLibrary } from "skia-canvas";
import { join } from "path";

try {
    FontLibrary.use("Helvetica Neue Thin", [join(process.cwd(), "app", "public", "fonts", "HelveticaNeue", "HelveticaNeueThin.otf")]);
    FontLibrary.use("Helvetica Neue Light", [join(process.cwd(), "app", "public", "fonts", "HelveticaNeue", "HelveticaNeueLight.otf")]);
    FontLibrary.use("Helvetica Neue Medium", [join(process.cwd(), "app", "public", "fonts", "HelveticaNeue", "HelveticaNeueMedium.otf")]);
    FontLibrary.use("Helvetica Neue Heavy", [join(process.cwd(), "app", "public", "fonts", "HelveticaNeue", "HelveticaNeueHeavy.otf")]);
} catch (error) {
    console.error("Failed to initialize font family:", error);
    console.debug("Fonts:", FontLibrary.families);
}

const CANVAS_SIZE = {
    width: 563,
    height: 308
};
const CARD_SIZE = {
    horizontal: {
        width: CANVAS_SIZE.width * .7,
        gap: 12,
        font: 18
    },
    vertical: {
        width: 121,
        gap: 10,
        font: 12
    },
    height: CANVAS_SIZE.height * .75,
    padding: 20,
    thickness: 2
};
const AVATAR_SIZE = {
    horizontal: 100,
    vertical: 48  
};
const ATTEMPT_SQUARE = {
    horizontal: {
        size: 30,
        gap: 3
    },
    vertical: {
        size: 20,
        gap: 1
    }
};
const COLOR = {
    white: "#fdfdfd",
    background: "#151515",
    cardBorder: "#272728",
    "category-0": "#272728", // unknown/hidden answer attempt
    "category-1": "#f7Da21",
    "category-2": "#b5e352",
    "category-3": "#00a2b3",
    "category-4": "#a354a8"
};

const AVATAR_URL = (userid, avatarName) => `https://cdn.discordapp.com/avatars/${userid}/${avatarName}.png?size=128`;

export const CANVAS_POSITION = (cardNum, cardCount = 1) => {
    return {
        x: (cardCount == 1)
            ? (CANVAS_SIZE.width - CARD_SIZE.horizontal.width) / 2
            : ((CARD_SIZE.padding * (cardNum - 1)) + (CARD_SIZE.vertical.width * (cardNum - 1))) + ((CANVAS_SIZE.width / 2) - (((CARD_SIZE.padding * (cardCount - 1)) + (CARD_SIZE.vertical.width * cardCount)) / 2)),
        y: ((CANVAS_SIZE.height - CARD_SIZE.height) / 2) + 10
    };
};

export function createCanvasObject (challengeNumber) {
    const canvas = new Canvas(CANVAS_SIZE.width, CANVAS_SIZE.height);

    const ctx = canvas.getContext("2d");
    // fill canvas background
    ctx.fillStyle = COLOR.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (challengeNumber || challengeNumber === 0)
        drawText(ctx, `Connections No. ${challengeNumber}`, CANVAS_SIZE.width / 2, 20, COLOR.white, 14, "center", "Helvetica Neue Light");
    return { canvas: canvas, ctx: ctx };
}

export async function canvasToImage (canvas) {
    return await new Promise((resolve, reject) => {
            try {
                const imgBuffer = canvas.toBufferSync("png");
                resolve(new Blob([imgBuffer], {type:"image/png"}));
            } catch (error) {
                reject(error);
            }
    });
}

export async function drawScoreHorizontal (ctx, position, attempts, userId, avatarName, stats) {
    return await Promise.all([
        loadImage(AVATAR_URL(userId, avatarName))
    ]).then(([
        avatarImg
    ]) => {
        const DIMS = {
            start: {
                x: position.x,
                y: position.y
            },
            end: {
                x: position.x + CARD_SIZE.horizontal.width,
                y: position.y + CARD_SIZE.height
            },
            center: {
                x: position.x + (CARD_SIZE.horizontal.width / 2),
                y: position.y + (CARD_SIZE.height / 2)
            }
        };
        let currY = DIMS.start.y + ((CARD_SIZE.horizontal.width / 5) - (AVATAR_SIZE.horizontal / 2));
        drawCardBorder(ctx, DIMS.start.x, DIMS.start.y, DIMS.end.x - DIMS.start.x, DIMS.end.y - DIMS.start.y);
        drawAvatar(ctx, DIMS.start.x + (CARD_SIZE.horizontal.width / 4) - (AVATAR_SIZE.horizontal / 2), currY, avatarImg, AVATAR_SIZE.horizontal);
        currY += AVATAR_SIZE.horizontal + ATTEMPT_SQUARE.horizontal.gap * 3;
        drawStatsHorizontal(ctx, DIMS.start.x + (CARD_SIZE.horizontal.width / 8), currY, stats);

        drawAttemptGridHorizontal(ctx,
            DIMS.center.x,
            DIMS.center.y - (((ATTEMPT_SQUARE.horizontal.gap * 5) + (ATTEMPT_SQUARE.horizontal.size * 6)) / 2),
            attempts ? attempts : [] // [!] (self) idiot-proofing
        ); 
    });
}

export async function drawScoreVertical (ctx, position, attempts, userId, avatarName, stats) {
    return await Promise.all([
        loadImage(AVATAR_URL(userId, avatarName))
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
                y: position.y + CARD_SIZE.height
            },
            center: {
                x: position.x + (CARD_SIZE.vertical.width / 2),
                y: position.y + (CARD_SIZE.height / 2)
            }
        };
        let currY = DIMS.start.y + CARD_SIZE.vertical.gap;
        drawCardBorder(ctx, DIMS.start.x, DIMS.start.y, DIMS.end.x - DIMS.start.x, DIMS.end.y - DIMS.start.y);
        drawAvatar(ctx, DIMS.start.x + CARD_SIZE.vertical.gap, currY, avatarImg, AVATAR_SIZE.vertical);
        drawStatsVertical(ctx, DIMS.end.x - CARD_SIZE.vertical.gap, currY, stats);

        currY = DIMS.start.y + (CARD_SIZE.height / 2.5);
        drawAttemptGridVertical(ctx,
            DIMS.center.x - (((ATTEMPT_SQUARE.vertical.gap * 3) + (ATTEMPT_SQUARE.vertical.size * 4)) / 2),
            currY,
            attempts ? attempts : [] // [!] (self) idiot-proofing
        ); 
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

function drawText (ctx, text, x, y, color, fontsize, align = "center", fontfamily = "Helvetica Neue Medium") {
    if (!FontLibrary.families.includes(fontfamily)) {
        console.warn(`Failed to draw text: Font family ${fontfamily} not found.`); // no idiot proofing/fallback fonts. Dev should know what they want, or don't draw at all.
        return;
    }
    const ogFont = ctx.font;
    const ogFIll = ctx.fillStyle;
    const ogAlign = ctx.textAlign;
    const ogBaseline = ctx.textBaseline;
    ctx.font = `${fontsize}px ${fontfamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.font = ogFont;
    ctx.fillStyle = ogFIll;
    ctx.textAlign = ogAlign;
    ctx.textBaseline = ogBaseline;
}

function drawStatsHorizontal (ctx, x, y, stats) {
    const altX = x + (CARD_SIZE.horizontal.width / 4);
    const altY = y + (CARD_SIZE.horizontal.font * 1.5);
    drawText(ctx, stats["1"], x, y, COLOR["category-1"], CARD_SIZE.horizontal.font);
    drawText(ctx, stats["2"], altX, y, COLOR["category-2"], CARD_SIZE.horizontal.font);
    drawText(ctx, stats["3"], x, altY, COLOR["category-3"], CARD_SIZE.horizontal.font);
    drawText(ctx, stats["4"], altX, altY, COLOR["category-4"], CARD_SIZE.horizontal.font);
    drawText(ctx, stats.total, x + ((altX - x) / 2), altY + (CARD_SIZE.horizontal.font * 2), COLOR["white"], CARD_SIZE.horizontal.font);
}

function drawStatsVertical (ctx, x, y, stats) {
    let i = 0;
    const incr = () => y + ((CARD_SIZE.vertical.font * 1.25) * i++);
    drawText(ctx, stats["1"], x, incr(), COLOR["category-1"], CARD_SIZE.vertical.font, "right");
    drawText(ctx, stats["2"], x, incr(), COLOR["category-2"], CARD_SIZE.vertical.font, "right");
    drawText(ctx, stats["3"], x, incr(), COLOR["category-3"], CARD_SIZE.vertical.font, "right");
    drawText(ctx, stats["4"], x, incr(), COLOR["category-4"], CARD_SIZE.vertical.font, "right");
    i += .5;
    drawText(ctx, stats.total, x, incr() , COLOR["white"], CARD_SIZE.vertical.font, "right");
}

function drawAttemptGridVertical (ctx, x, y, attemptCategories) { // attemptCategories here is an Array of attempts, where each attempt is an Array of Numbers that corrospond to a specific category (1-4). 0 Marks an unknown category and -1 marks an unused attempt.
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

function drawAttemptGridHorizontal (ctx, x, y, attemptCategories) { // attemptCategories here is an Array of attempts, where each attempt is an Array of Numbers that corrospond to a specific category (1-4).
    const attempts = Object.assign(new Array(6).fill([-1, -1, -1, -1]), attemptCategories.slice(-6));
    attempts.forEach((attempt, row) => {
        const offsetY = row * (ATTEMPT_SQUARE.horizontal.gap + ATTEMPT_SQUARE.horizontal.size);
        attempt.forEach((category, col) => {
            const offsetX = col * (ATTEMPT_SQUARE.horizontal.gap + ATTEMPT_SQUARE.horizontal.size);
            if (category === -1)
                drawCardBorder(ctx, x + offsetX, y + offsetY, ATTEMPT_SQUARE.horizontal.size, ATTEMPT_SQUARE.horizontal.size);
            else
                drawAttemptSquare(ctx, x + offsetX, y + offsetY, COLOR[`category-${category}`], ATTEMPT_SQUARE.horizontal.size);
        });
    });
}
