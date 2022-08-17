var KnockAudio = null;
window.onload = function () {
    window.game = new Game();

    const a = new Audio(document.getElementById("knock").src);
    a.addEventListener("canplaythrough", () => {
        KnockAudio = a;
    }, false);
};

class Game {
    constructor() {
        this.debug = false;
        this.canvas = document.getElementsByTagName("canvas")[0];
        /**@type {CanvasRenderingContext2D} */
        this.ctx = this.canvas.getContext("2d");
        this.resizeCanvas();

        this.started = false;
        this.loopData = {};
        this.state = {};

        this.old = {
            w: document.body.offsetWidth,
            h: document.body.offsetHeight
        };

        this.playerParameters = {
            platHeight: document.body.offsetHeight / 5,
            platWidth: 10,
            color: "white",
            playerSpeed: 5,
            playerSpeedRun: 10
        };
        this.playerBlue = {
            score: 0,
            h: document.body.offsetHeight / 2,
            // no move: 0 | up: 1 | down: -1
            moving: 0
        };
        this.playerRed = {
            score: 0,
            h: document.body.offsetHeight / 2,
            // no move: 0 | up: 1 | down: -1
            moving: 0
        };
        this.ball = {
            vector: {
                x: 0,
                y: 0,
                // no move: 0 | up: 1 | down: -1
                moving: 0,
                angle: 0
            },
            color: "white",
            size: 10, // in px
            x: document.body.offsetWidth / 2,
            y: document.body.offsetHeight / 2,
            trailing: false,
            speed: 5,
            speedAddition: 1,
            count: 0,
            last: [{ x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }]
        };
        this.ball.baseSpeed = this.ball.speed;
        this.score = {
            duration: 5000,
            started: 0,
            p: 0
        };
        this.colision = {
            last: 0,
            wait: 50
        };
        this.key = [];

        this.render(this.ctx);
        this.update(this.ctx);
        this.core = this.loop();
        this.init();
        this.core.main();
    }

    getPixelRatio() { var that = this; var b = ['webkitBackingStorePixelRatio', 'mozBackingStorePixelRatio', 'msBackingStorePixelRatio', 'oBackingStorePixelRatio', 'backingStorePixelRatio']; var d = window.devicePixelRatio; var r = b.reduce(function (_, c) { return (that.ctx.hasOwnProperty(c) ? that.ctx[c] : 1); }); return d / parseInt(r); }

    resizeCanvas() { var w = document.body.offsetWidth, h = document.body.offsetHeight; if (this.debug) { console.log(w, h); } var that = this; var r = that.getPixelRatio(); that.canvas.width = Math.round(w * r); that.canvas.height = Math.round(h * r); that.canvas.style.width = w + 'px'; that.canvas.style.height = h + 'px'; that.ctx.setTransform(r, 0, 0, r, 0, 0); }

    render() {
        const ctx = this.ctx,
            w = document.body.offsetWidth,
            h = document.body.offsetHeight;

        if (w != this.old.w || h != this.old.h) {
            this.resizeCanvas();
            this.old.w = w;
            this.old.h = h;
            if (this.debug) console.log(w, h);
        }
        this.playerParameters.platHeight = h / 5;
        // if (!this.started) this.ball.x = w / 2;

        ctx.clearRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = "middle";
        ctx.imageSmoothingQuality = "high";

        ctx.globalAlpha = 0.5;

        // blue player camp line
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, 10, h);

        // red player camp line
        ctx.fillStyle = "red";
        ctx.fillRect(w - 10, 0, w, h);

        // middle line
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "white";
        ctx.fillRect((w / 2) - 5, 0, 10, h / 2 - 20);
        ctx.fillRect((w / 2) - 5, h / 2 + 20, 10, h);
        // middle line circle
        this.drawCircle(w / 2, h / 2, 20);

        ctx.globalAlpha = 1;

        // top and bottom line
        ctx.fillRect(0, 0, w, 10);
        ctx.fillRect(0, h - 10, w, 10);

        // draw the ball
        this.drawCircle(this.ball.x, this.ball.y, this.ball.size);

        this.ball.count++;
        if (this.ball.count >= 2 && this.started) {
            this.ball.count = 0;

            this.ball.last.push({ x: this.ball.x, y: this.ball.y });
            this.ball.last.shift();
        }

        if (this.ball.trailing) {
            ctx.globalAlpha = 0.8;
            this.drawCircle(this.ball.last[3].x, this.ball.last[3].y, this.ball.size);
            ctx.globalAlpha = 0.6;
            this.drawCircle(this.ball.last[2].x, this.ball.last[2].y, this.ball.size);
            ctx.globalAlpha = 0.4;
            this.drawCircle(this.ball.last[1].x, this.ball.last[1].y, this.ball.size);
            ctx.globalAlpha = 0.2;
            this.drawCircle(this.ball.last[0].x, this.ball.last[0].y, this.ball.size);
        }
        ctx.globalAlpha = 1;

        //draw the vector of the ball
        if (this.debug) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(this.ball.x, this.ball.y);
            ctx.lineTo((this.ball.x + (this.ball.vector.x) * 50), (this.ball.y + (this.ball.vector.y) * 50));
            ctx.stroke();
            ctx.closePath();
        }

        const playerRadiusBlue = { tl: this.playerParameters.platWidth / 2, tr: 0, br: 0, bl: this.playerParameters.platWidth / 2 };
        const playerRadiusRed = { tl: 0, tr: this.playerParameters.platWidth / 2, br: this.playerParameters.platWidth / 2, bl: 0 };

        //draw blue player
        ctx.fillStyle = this.playerParameters.color;
        this.drawRoundRectangle(20, this.playerBlue.h - this.playerParameters.platHeight / 2, // to center the form
            this.playerParameters.platWidth, this.playerParameters.platHeight,
            playerRadiusBlue);

        //draw red player
        ctx.fillStyle = this.playerParameters.color;
        this.drawRoundRectangle(w - 30, this.playerRed.h - this.playerParameters.platHeight / 2, // to center the form
            this.playerParameters.platWidth, this.playerParameters.platHeight,
            playerRadiusRed);

        // draw score
        ctx.fillStyle = "white";
        ctx.font = "1.5em ComicSansMSBold";
        ctx.fillText(this.playerBlue.score, w / 2 - 40, 40);
        ctx.fillText("-", w / 2, 40);
        ctx.fillText(this.playerRed.score, w / 2 + 40, 40);

        if (!this.started) {
            ctx.fillText("Press SPACE to start the game.", w / 2, h - 120);

            // command for blue player
            ctx.textAlign = "left";
            ctx.fillText("Z to go up.", 80, 80);
            ctx.fillText("S to go down.", 80, h - 80);

            // command for red player
            ctx.textAlign = "right";
            ctx.fillText("ArrowUp to go up.", w - 80, 80);
            ctx.fillText("ArrowDown to go down.", w - 80, h - 80);
        }

        if (this.score.started + this.score.duration >= Date.now()) {
            ctx.textAlign = "center";
            ctx.fillStyle = "blue";
            if (this.score.p == 1) ctx.fillText("Player Blue Scored!", w / 2 - w / 4, 160);
            ctx.fillStyle = "red";
            if (this.score.p == -1) ctx.fillText("Player Red Scored! ", w / 2 + w / 4, 160);
        }
    }

    init() {
        document.onkeydown = ev => {
            // if (this.debug) console.log(`pressed ${ev.code}`);
            if (this.key.indexOf(ev.code.toLowerCase()) == -1) this.key.push(ev.code.toLowerCase());
        };
        onkeyup = ev => {
            // if (this.debug) console.log(`released ${ev.code}`);
            if (this.key.indexOf(ev.code.toLowerCase()) > -1) this.key.splice(this.key.indexOf(ev.code.toLowerCase()), 1);

        };
    }

    update() {
        const w = document.body.offsetWidth,
            h = document.body.offsetHeight;

        if (!this.started) {
            this.ball.x = document.body.offsetWidth / 2;
            this.ball.y = document.body.offsetHeight / 2;
        }

        if (this.key.includes("space") && !this.started) {
            this.started = true;

            const side = Math.round(Math.random());

            /*
            !Math explanation
            sin and cos are 2 pi modulos, meaning each time you add 2 pi, you make one full circle circumference.
            so we want a random number between 0 and 2, given by 'Math.random()*2'
            then multiply it by pi. You have now a random angle between 0° and 360°.

            but we want two angles, one between 150° and 210° and the otehr between 330° and 30°


            Each angle converted with PI
            150° = 5pi/6
            210° = 7pi/6
            330° = 11pi/6
            30°  = pi/6

            so random left angle:
            'Math.random() * (Math.PI * 2)/6 + (Math.PI * 5)/6'

            random right angle:
            'Math.random() * (Math.PI * 2)/6 + (Math.PI * 11)/6'
            */

            if (side == 0) {
                const ang = Math.random() * (Math.PI * 2) / 6 + (Math.PI * 11) / 6;
                this.ball.vector = { x: Math.cos(ang), y: Math.sin(ang), moving: Math.sin(ang) > 0 ? 1 : -1 }; // then convert it in x y coordinates
                this.ball.vector.angle = ang % 360;
            } else {
                const ang = Math.random() * (Math.PI * 2) / 6 + (Math.PI * 5) / 6;
                this.ball.vector = { x: Math.cos(ang), y: Math.sin(ang), moving: Math.sin(ang) > 0 ? 1 : -1 }; // then convert it in x y coordinates
                this.ball.vector.angle = ang % 360;
            }
        }

        // player blue movement
        if (this.key.includes("keyw") && this.key.includes("shiftleft")) {
            this.playerBlue.h -= this.playerParameters.playerSpeedRun;
            this.playerBlue.moving = -1;
        } else if (this.key.includes("keys") && this.key.includes("shiftleft")) {
            this.playerBlue.h += this.playerParameters.playerSpeedRun;
            this.playerBlue.moving = 1;
        } else if (this.key.includes("keyw")) {
            this.playerBlue.h -= this.playerParameters.playerSpeed;
            this.playerBlue.moving = -1;
        } else if (this.key.includes("keys")) {
            this.playerBlue.h += this.playerParameters.playerSpeed;
            this.playerBlue.moving = 1;
        }
        if (!this.key.includes('keyw') && !this.key.includes("keys")) {
            this.playerBlue.moving = 0;
        }

        if (this.playerBlue.h < this.playerParameters.platHeight / 2 + 20) { this.playerBlue.h = this.playerParameters.platHeight / 2 + 20; }
        if (this.playerBlue.h > h - (this.playerParameters.platHeight / 2 + 20)) { this.playerBlue.h = h - (this.playerParameters.platHeight / 2 + 20); }

        // player red movement
        if (this.key.includes("arrowup") && this.key.includes("shiftright")) {
            this.playerRed.h -= this.playerParameters.playerSpeedRun;
            this.playerRed.moving = -1;
        } else if (this.key.includes("arrowdown") && this.key.includes("shiftright")) {
            this.playerRed.h += this.playerParameters.playerSpeedRun;
            this.playerRed.moving = 1;
        } else if (this.key.includes("arrowup")) {
            this.playerRed.h -= this.playerParameters.playerSpeed;
            this.playerRed.moving = -1;
        } else if (this.key.includes("arrowdown")) {
            this.playerRed.h += this.playerParameters.playerSpeed;
            this.playerRed.moving = 1;
        }
        if (!this.key.includes('arrowup') && !this.key.includes("arrowdown")) {
            this.playerRed.moving = 0;
        }

        // bound players to the screen
        if (this.playerRed.h < this.playerParameters.platHeight / 2 + 20) { this.playerRed.h = this.playerParameters.platHeight / 2 + 20; }
        if (this.playerRed.h > h - (this.playerParameters.platHeight / 2 + 20)) { this.playerRed.h = h - (this.playerParameters.platHeight / 2 + 20); }

        //----------------- ball part -----------------\\
        this.ball.x += this.ball.vector.x * this.ball.speed;
        this.ball.y += this.ball.vector.y * this.ball.speed;

        if (this.ball.y < this.ball.size + 10) { this.ball.vector.y = -this.ball.vector.y; this.ball.vector.moving = -this.ball.vector.moving; }
        if (this.ball.y > h - (this.ball.size + 10)) { this.ball.vector.y = -this.ball.vector.y; this.ball.vector.moving = -this.ball.vector.moving; }

        if (this.ball.x < this.ball.size + 10) { this.playerRed.score++; this.resetGame(); this.score.p = -1; this.score.started = Date.now(); }
        if (this.ball.x > w - (this.ball.size + 10)) { this.playerBlue.score++; this.resetGame(); this.score.p = 1; this.score.started = Date.now(); }

        // colision with players
        const b = this.playerBlue,
            r = this.playerRed,
            p = this.playerParameters;

        //? blue colision
        if ((this.ball.x <= 20 + p.platWidth + this.ball.size) &&
            (b.h + p.platHeight / 2 >= this.ball.y && this.ball.y >= b.h - p.platHeight / 2) &&
            this.colision.last + this.colision.wait <= Date.now()) {
            this.ball.vector.x = -this.ball.vector.x;
            this.colision.last = Date.now();
            KnockAudio.play();

            //? check if player moving, and if it's same direction as the ball
            if (this.playerBlue.moving != 0) {
                if (this.playerBlue.moving == this.ball.vector.moving) {
                    this.ball.speed += this.ball.speedAddition;
                    if (this.debug) console.log(`ball speed: ${this.ball.speed}\np move: ${this.playerBlue.moving}\nball move: ${this.ball.vector.moving}`);
                } else {
                    this.ball.speed -= this.ball.speedAddition;
                    if (this.ball.speed < this.ball.baseSpeed) this.ball.speed = this.ball.baseSpeed;
                    if (this.debug) console.log(`ball speed: ${this.ball.speed}\np move: ${this.playerBlue.moving}\nball move: ${this.ball.vector.moving}`);
                }
            }

            //edit the vector to make the ball change a little bit her trajectory
            this.editVector();
        }

        //! red colision
        if ((this.ball.x >= w - (20 + p.platWidth + this.ball.size)) &&
            (r.h + p.platHeight / 2 >= this.ball.y && this.ball.y >= r.h - p.platHeight / 2) &&
            this.colision.last + this.colision.wait <= Date.now()) {
            this.ball.vector.x = -this.ball.vector.x;
            this.colision.last = Date.now();
            KnockAudio.play();

            //! check if player moving, and if it's same direction as the ball
            if (this.playerRed.moving != 0) {
                if (this.playerRed.moving == this.ball.vector.moving) {
                    this.ball.speed += this.ball.speedAddition;
                    if (this.debug) console.log(`ball speed: ${this.ball.speed}\np move: ${this.playerRed.moving}\nball move: ${this.ball.vector.moving}`);
                } else {
                    this.ball.speed -= this.ball.speedAddition;
                    if (this.ball.speed < this.ball.baseSpeed) this.ball.speed = this.ball.baseSpeed;
                    if (this.debug) console.log(`ball speed: ${this.ball.speed}\np move: ${this.playerRed.moving}\nball move: ${this.ball.vector.moving}`);
                }
            }

            //edit the vector to make the ball change a little bit her trajectory
            this.editVector();
        }

        if (this.ball.speed >= 10) this.ball.trailing = true;
        else this.ball.trailing = false;

        if (this.ball.x < 0 || this.ball.x > w || this.ball.y < 0 || this.ball.y > h) this.resetGame();
    }

    editVector() {
        /*
        !Math explanation
        ?How we choose the starting angle
        sin and cos are 2 pi modulos, meaning each time you add 2 pi, you make one full circle circumference.
        so we want a random number between 0 and 2, given by 'Math.random()*2'
        then multiply it by pi. You have now a random angle between 0° and 360°.

        but we want two angles, one between 150° and 210° and the otehr between 330° and 30°


        Each angle converted with PI
        150° = 5pi/6
        210° = 7pi/6
        330° = 11pi/6
        30°  = pi/6

        so random left angle:
        'Math.random() * (Math.PI * 2)/6 + (Math.PI * 5)/6'

        random right angle:
        'Math.random() * (Math.PI * 2)/6 + (Math.PI * 11)/6'

        ?How to add -+ 2°

        first of all, if 2PI is 360
        then (2 * 2PI) / 360 is 2°
        */
        var vector = this.ball.vector;
        const angle = vector.angle; // get back the angle
        const sign = (Math.round(Math.random()) == 0 ? -1 : 1);
        const newAngle = angle + sign * (Math.random() * ((2 * 2 * Math.PI) / 360));
        this.ball.vector.angle = newAngle;
        this.ball.vector.x = (this.ball.vector.x > 0 ? Math.cos(newAngle) : -Math.cos(newAngle));
        this.ball.vector.y = (this.ball.vector.y > 0 ? Math.sin(newAngle) : -Math.sin(newAngle));
    }

    loop() { const that = this; var loop = that.loopData, a = 60, b = 1e3 / a, c = window.performance.now(), d = { e: { g: 0, h: c, i: 0 }, f: { g: 0, h: c, i: 0 } }, j = 5, l = "e"; loop.a = 0, loop.main = function mainLoop(m) { loop.stopLoop = window.requestAnimationFrame(loop.main); var n = m, o = n - c, p, k; if (o > b) { for (var q in c = n - o % b, d) ++d[q].g, d[q].i = n - d[q].h; p = d[l], loop.a = Math.round(1e3 / (p.i / p.g) * 100) / 100, k = d.e.g === d.f.g ? j * a : 2 * j * a, p.g > k && (d[l].g = 0, d[l].h = n, d[l].i = 0, l = "e" === l ? "f" : "e"); try { that.state = that.update(n), that.render() } catch (e) { console.log(e), window.cancelAnimationFrame(loop.stopLoop) } } }; return loop; }

    drawCircle(x, y, r, fill, stroke) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        if (fill === true || (!fill && !stroke)) ctx.fill();
        if (stroke === true) ctx.stroke();
        ctx.closePath();
    }

    drawRoundRectangle(x, y, width, height, radius, fill, stroke) {
        const ctx = this.ctx;
        if (isNaN(x) === true) throw new TypeError(`x is not a number.`);
        if (isNaN(y) === true) throw new TypeError(`y is not a number.`);
        if (isNaN(width) === true) throw new TypeError(`w is not a number.`);
        if (isNaN(height) === true) throw new TypeError(`h is not a number.`);

        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (width == 0 || height == 0) return;
        if (typeof radius === 'number') {
            // smooth edge if width or height smaller than radius
            while ((Math.abs(width) / 2) < radius || (Math.abs(height) / 2) < radius) {
                radius = radius - 1;
            }
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
            var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }

        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        if (fill === true || (!fill && !stroke)) ctx.fill();
        if (stroke === true) ctx.stroke();
        ctx.closePath();
    }

    resetGame() {
        this.started = false;
        this.ball.vector = { x: 0, y: 0 };
        this.ball.x = document.body.offsetWidth / 2;
        this.ball.y = document.body.offsetHeight / 2;
        this.ball.last = [{ x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }, { x: document.body.offsetWidth / 2, y: document.body.offsetHeight / 2 }];
        this.ball.speed = this.ball.baseSpeed;

        this.playerBlue.h = document.body.offsetHeight / 2;
        this.playerRed.h = document.body.offsetHeight / 2;

    }
}