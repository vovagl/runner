import { Application, AnimatedSprite, Assets, Sprite, Text, TextStyle} from "pixi.js";
import { sound } from "@pixi/sound";
import * as PIXI from "pixi.js";

(async ()=>{
    const app=new Application();
    await app.init({
        width:window.innerWidth,
        height:window.innerHeight/2,
        resolution: window.devicePixelRatio,
        antialias: true, 
    });

    const rotateOverlay = document.createElement("div");
    rotateOverlay.id = "rotateOverlay";
    rotateOverlay.innerText = "Turn the device horizontally. Поверните устройство горизонтально";
    Object.assign(rotateOverlay.style, {
        position: "fixed",
        inset: "0",
        background: "#fa3030ff",
        backdropFilter: "blur(16px)",
        color: "white",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        zIndex: "9999",
        textAlign: "center",
        overflow: "hidden", 
    });
document.body.appendChild(rotateOverlay);

function checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;

    if (portrait) {
        rotateOverlay.style.display = "flex"; 
        app.ticker.speed = 0;                 
    } else {
        rotateOverlay.style.display = "none"; 
        app.ticker.speed = 1;                 
    }
}
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
checkOrientation();

     app.canvas.style.left = "50%";
     app.canvas.style.top = "0";
     app.canvas.style.transform = "translateX(-50%)";
     document.body.style.margin = "0";
     document.body.style.overflow = "hidden";
     app.stage.x = 0
     app.stage.y = 0
     document.body.appendChild(app.canvas);

    await Assets.load("/images/img.jpg");
    const bgTexture = Assets.get("/images/img.jpg"); 
    const background = new Sprite(bgTexture);
    app.stage.addChild(background); 

    const levelStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 36,
    fill: "white",  
    stroke: "#000000",
    strokeWidth: 4,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 4,
    dropShadowDistance: 2
});
    const levelText = new Text({
        text:"Level 1",
        style: levelStyle
});
    levelText.x = app.screen.width / 2 - levelText.width / 2;
    levelText.y = 20; 
    app.stage.addChild(levelText);

    const scoreStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "#ffffff", 
    stroke: "#000000",
    strokeWidth: 4,
    fontWeight: "bold"
});

let score = 0;
let level = 1;
const scoreText = new Text({
    text :"Score: 0",
    style : scoreStyle
});
scoreText.x = app.screen.width / 2 - scoreText.width / 2; 
scoreText.y = 60; 

let highScore = parseInt(localStorage.getItem('highScore')) || 0;
const recordStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "#000000",
    strokeWidth: 4,
    fontWeight: "bold"
});

const recordText = new Text({
    text :`Record:${highScore}` ,
    style : recordStyle
});
recordText.x = 10; 
recordText.y = 10; 
app.stage.addChild(recordText);

const winText = new Text({
    text: "YOU WIN!",
    style: new TextStyle({
        fontSize: 94,
        fill: "#ffff00",
        stroke: "#000000",
        strokeWidth: 8,
        fontWeight: "bold"
    })
});

winText.visible = false;
app.stage.addChild(winText);
const gameOverText = new Text({
    text: "GAME OVER",
    style: new TextStyle({
        fontSize: 64,
        fill: "#ff2222",
        stroke: "#000000",
        strokeWidth: 6,
        fontWeight: "bold"
    })
});

gameOverText.visible = false;
app.stage.addChild(gameOverText);
app.stage.addChild(scoreText);

    let stopSpeed = 6;
    let babaySpeed = 1;
    let wasRunningBeforeJump = false;
    let collisionLocked = false;
    let isRunning = false;
    let isJumping = false;
    let isFalling = false;
    let velocityY = 0;
    const gravity = 1.2;
    let jumpPower = 16;
    let groundY = app.screen.height;
    let scoreGiven = false;
    let isWin = false;
    const fireworks = [];
    let fireworkTimer = 0;
    let fallsThisLevel = 0;
    let isGameOver = false;
    let hitThisObstacle = false;
    let inputLocked = false;

    await Assets.load("/images/stop.png");
    const stopTexture = Assets.get("/images/stop.png");
    const stop=new Sprite(stopTexture);
    stop.anchor.set(0, 1);
    const initialStopScale = 0.12; 
    stop.scale.set(initialStopScale);
    stop.x = app.screen.width;
    stop.y = app.screen.height;
    app.stage.addChild(stop);

    const standingBabay = [
        "/images/standing/frame-1.png",
        "/images/standing/frame-2.png",
    ];
    const runBabay=[
        "/images/run/frame-1.png",
        "/images/run/frame-2.png",
        "/images/run/frame-3.png",
        "/images/run/frame-4.png",
        "/images/run/frame-5.png",
    ];
    const fallBabay=[
        "/images/fall/frame-1.png",
        "/images/fall/frame-2.png",
        "/images/fall/frame-3.png",
        "/images/fall/frame-4.png",
        "/images/fall/frame-5.png",
    ];
    sound.add("game", "/sounds/game.mp3");
    sound.add("jump", "/sounds/jump.mp3");
    sound.add("fall", "/sounds/fall.mp3");

    const standingTexturesObj = await Assets.load(standingBabay);
    const standingTexturesBabay = standingBabay.map(path =>standingTexturesObj[path]);

    const runTexturesObj = await Assets.load(runBabay);
    const runTexturesBabay = runBabay.map(path=>runTexturesObj[path]);

    const fallTexturesObj = await Assets.load(fallBabay);
    const fallTexturesBabay = fallBabay.map(path=>fallTexturesObj[path]);



    const babay = new AnimatedSprite(standingTexturesBabay);
    babay.animationSpeed = 0.15; 
    babay.play();
    const initialBabayScale = 0.3;
    babay.scale.set(initialBabayScale);
    babay.anchor.set(0, 1);
    babay.y=app.screen.height;
    const babayBaseHeight = babay.texture.height;
    babay.x = 0;
    app.stage.addChild(babay);

    function updateJumpPowerByScreen() {
    const w = window.innerWidth;
    if (w <= 768) {
        jumpPower = 16;          
    } else if (w <= 1024) {
        jumpPower = 22;        
    } else if (w <= 1600) {
        jumpPower = 24;         
    } else {
        jumpPower = 26;         
    }
}


   const resize = () => { 
    const w = window.innerWidth;
    const h = window.innerHeight / 2;
    app.renderer.resize(w, h);
    levelText.x = w / 2 - levelText.width / 2;
    scoreText.x = w / 2 - scoreText.width / 2;
    background.width = w;
    background.height = h;
    background.x = 0;
    background.y = 0;

    const factorBabay = w <= 768 ? 0.4 : initialBabayScale;
    const babayTargetHeight = h * factorBabay;
    const scaleBabay = babayTargetHeight / babayBaseHeight;
    babay.scale.set(scaleBabay);
    babay.y = h;

    const factorStop = w <= 768 ? 0.16 : initialStopScale;
    const stopTargetHeight = h * factorStop;
    const scaleStop = stopTargetHeight / stop.texture.height;
    stop.scale.set(scaleStop);
    stop.y = h;

    groundY = h; 
    winText.x = app.screen.width / 2 - winText.width / 2;
    winText.y = app.screen.height / 2 - winText.height / 2; 
    gameOverText.x = app.screen.width / 2 - gameOverText.width / 2;
    gameOverText.y = app.screen.height / 2 - gameOverText.height / 2;

updateJumpPowerByScreen();
};

resize();

window.addEventListener("resize", resize);


    const hitTest = (babay, stop) => {
    const aBabay = babay.getBounds(); 
    const bStop = stop.getBounds(); 
    return (
        aBabay.x < bStop.x + bStop.width &&
        aBabay.x + aBabay.width > bStop.x &&
        aBabay.y < bStop.y + bStop.height &&
        aBabay.y + aBabay.height > bStop.y
    );
};


    const button = document.createElement("button");
    button.textContent = "start";
    button.style.cursor = "pointer";
    button.style.left = "50%";
    button.style.transform = "translateX(-50%)";
    button.style.position = "absolute";
    button.style.fontSize = "18px";
    button.style.background = "green";
    button.style.padding = "24px 16px";
    button.style.borderRadius = "50%";
    document.body.appendChild(button);

    const jumpButton = document.createElement("button");
    jumpButton.textContent = "jump";
    jumpButton.style.cursor = "pointer";
    jumpButton.style.position = "absolute";
    jumpButton.style.left = "50%";
    jumpButton.style.transform = "translateX(-50%)";
    jumpButton.style.fontSize = "18px";
    jumpButton.style.borderRadius = "50%";
    jumpButton.style.background = "#b998f8";
    jumpButton.style.padding = "16px 10px";
    document.body.appendChild(jumpButton);

    const updateButtonPositions = () => {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;


    button.style.top = (screenHeight / 1.8) + "px";
    jumpButton.style.top = (screenHeight / 1.8 + 90) + "px";
};
updateButtonPositions();


window.addEventListener("resize", updateButtonPositions);

    const jump = () => {
        if (!isJumping && !isFalling) {
            wasRunningBeforeJump = isRunning;
            velocityY = -jumpPower;
            isJumping = true;
            sound.play("jump");
        }
};
    function playRun() {
    babay.stop();
    babay.textures = runTexturesBabay;
    babay.loop = true;
    babay.animationSpeed = 0.15;
    babay.play();
    playRunSound();
    
};

    function playRunSound() {
    if (!sound.isPlaying("game")) {
         sound.play("game", { loop: true });
    }
}

    function playStand() {  
    babay.stop();
    babay.textures = standingTexturesBabay;
    babay.loop = true;
    babay.animationSpeed = 0.1;
    babay.play();
    
}

    function playFall() {
     babay.stop();
     babay.textures = fallTexturesBabay;
     babay.loop = false;
     babay.animationSpeed = 0.2;
     babay.gotoAndPlay(0);
     sound.play("fall");
     babay.onComplete = () => { 
        if (!isFalling && fallsThisLevel<3) {
            playStand()
        }
    }
}
function startFall() {
    fallsThisLevel++;
    isFalling = true;
    isRunning = false;
    isJumping = false;
    velocityY = 0;
    velocityY += 2; 
     playFall();
}

    function addScore(points) {
    score += points;
    scoreText.text = `Score: ${score}`;
    scoreText.x = app.screen.width / 2 - scoreText.width / 2;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        recordText.text = `Record: ${highScore}`;
    }
}

function warmupSounds() {
    ["jump","fall"].forEach(name => {
        sound.play(name, { volume: 0 });
        sound.stop(name);
    });
}

    button.addEventListener("click", async() => {
        
        if (inputLocked) return; 
        warmupSounds()
        if (isWin) {
        isWin = false;
        winText.visible = false;
        fireworkTimer = 0;
        nextLevel();
         isRunning = true;
        playRun();
        updateButtonText();
        return;
     }

    
        if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
    }

    if (screen.orientation?.lock) {
        try {
            await screen.orientation.lock("landscape");
        } catch(e) {}
    }
        isRunning = !isRunning;
        if (isRunning) {
            playRun();
        } else {
            playStand();
        }
        updateButtonText()
    });

    const updateButtonText = () => {
        
    button.textContent = isRunning ? "pause" : "start";
    button.style.background = isRunning ? "yellow" : "green";
};


    jumpButton.addEventListener("click", ()=>{
        if (inputLocked) return; 
        jump()}
    );

function updateLevelText() {
    levelText.text = `Level ${level}`;
    levelText.x = app.screen.width / 2 - levelText.width / 2;
}
function nextLevel(restart = false) {
    if (!restart) 
        level++;
        isWin = false;
        winText.visible = false;  
        isRunning = false;
        isJumping = false;
        isFalling = false;
        velocityY = 0;
        wasRunningBeforeJump = false;
        babay.textures = standingTexturesBabay;
        playStand();
        scoreGiven = false;
        hitThisObstacle = false;
        collisionLocked = false;
        updateButtonText();
        updateLevelText();
    
    if (!restart) {
    level <= 6? stopSpeed += 1 : stopSpeed=stopSpeed;
    level <= 6? jumpPower -= 1 : jumpPower=jumpPower;
    level <= 6? babaySpeed +=0.3 : babaySpeed=babaySpeed;
    }
    babay.x = 0;
    babay.y = groundY;
    stop.x = app.screen.width + 200;
    fallsThisLevel = 0;
}
function winLevel() {
    isWin = true;
    isRunning = false;
    stop.x=app.screen.width + Math.random() * 300;
    playStand();
    winText.visible = true;
    winText.x = app.screen.width / 2 - winText.width / 2;
    winText.y = app.screen.height / 2 - winText.height / 2;
    updateButtonText();


    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            spawnFirework(
                Math.random() * app.screen.width,
                Math.random() * app.screen.height * 0.5
            );
        }, i * 250);
    }
}
function spawnFirework(x, y) {
    for (let i = 0; i < 25; i++) {
        const g = new PIXI.Graphics()
            .circle(0, 0, 3)
            .fill(0xffffff * Math.random());

        g.x = x;
        g.y = y;

        g.vx = (Math.random() - 0.5) * 8;
        g.vy = (Math.random() - 0.5) * 8;
        g.life = 60;

        fireworks.push(g);
        app.stage.addChild(g);
    }
}

function gameOver() {
    isGameOver = true;
    isRunning = false;
    isJumping = false;
    isFalling = false;
    velocityY = 0;
    playStand();

    gameOverText.visible = true;
    gameOverText.x = app.screen.width/2 - gameOverText.width/2;
    gameOverText.y = app.screen.height/2 - gameOverText.height/2;

    updateButtonText();

    stop.x = app.screen.width + 200;
    setTimeout(() => {
        gameOverText.visible = false;
        isGameOver = false;
        nextLevel(true);   
        inputLocked = false;
    }, 2000);
}




    app.ticker.add(() => {   

    for (let i = fireworks.length - 1; i >= 0; i--) {
    const p = fireworks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;

    if (p.life <= 0) {
        app.stage.removeChild(p);
        fireworks.splice(i, 1);
    }
}

if (isWin) {
    fireworkTimer++;
        if (fireworkTimer % 15 === 0) { 
            spawnFirework(
                Math.random() * app.screen.width,
                Math.random() * app.screen.height * 0.5
            );
        }
        return;
    }


        if (isRunning || isFalling) {
        stop.x -= stopSpeed;
            if (stop.x + stop.width < 0) {
                stop.x = app.screen.width + Math.random() * 300;
                scoreGiven = false;
                 hitThisObstacle = false;
           }
        }

        if (isRunning && !isFalling && !isJumping) {
            babay.x += babaySpeed;
            if (babay.x + babay.width >= app.screen.width) {
                babay.x = 0;
                babay.y = groundY;
                winLevel();
                isRunning = false;
        updateButtonText();
    }
        }


if (hitTest(babay, stop) && !collisionLocked && !isFalling) {
        collisionLocked = true;
        hitThisObstacle = true;
        isJumping = false;      
        startFall();
        updateButtonText();
    }


        if (isFalling) {
           if (babay.y < groundY) {
        velocityY += gravity;
        babay.y += velocityY;
    } else
             {
            babay.y = groundY;
            velocityY = 0;
            stop.x = stop.x - babay.width;
            isFalling = false;
            isJumping = false;    
            collisionLocked = false;
             if (fallsThisLevel >= 3) { 
                inputLocked=true
             setTimeout(()=>{
                gameOver();
             }, 600);
             fallsThisLevel = 0;
             return;
             }

        } 
    }

    if (isJumping && !isFalling

        ) {
        velocityY += gravity;
        babay.y += velocityY;
        if (babay.y >= groundY) {
            babay.y = groundY;
            velocityY = 0;
            isJumping = false;
            
            if (wasRunningBeforeJump) {
            playRun()
        } 
         else {
         playStand()
          }    
        }
    }
    
    if (
    !scoreGiven &&
    !isFalling &&
    !hitThisObstacle && 
    stop.x + stop.width < babay.x
) {
    scoreGiven = true;
    addScore(10);
}
    });
})();    

