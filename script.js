const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const menu = document.getElementById('menu');
const gameScreen = document.getElementById('gameScreen');
const gameInfo = document.getElementById('gameInfo');

let score = 0;
let lives = 3;
let phase = 1;
let gameRunning = false;
let paused = false;

let player;
let bullets = [];
let enemies = [];
let particles = [];
let powerUps = [];
let stars = [];

let keys = {};
let playerName = "";
let doubleShot = false;
let doubleShotEndTime = 0;

let highscores = JSON.parse(localStorage.getItem('spaceHighscores')) || [];

// ===================== CLASSES =====================
class Player {
  constructor() {
    this.width = 60;
    this.height = 55;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - 100;
    this.speed = 7;
  }

  update() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;

    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(50, Math.min(canvas.height - this.height - 20, this.y));
  }

  draw() {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width/2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(this.x + 18, this.y + 12, this.width - 36, 22);

    ctx.fillStyle = '#0088ff';
    ctx.fillRect(this.x + 5, this.y + 30, 14, 18);
    ctx.fillRect(this.x + this.width - 19, this.y + 30, 14, 18);
  }
}

class Bullet {
  constructor(x, y, isDouble = false) {
    this.x = x;
    this.y = y;
    this.width = 6;
    this.height = 20;
    this.speed = 15;
    this.isDouble = isDouble;
  }

  update() { this.y -= this.speed; }

  draw() {
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.fillStyle = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Enemy {
  constructor() {
    this.width = 50;
    this.height = 40;
    this.x = Math.random() * (canvas.width - this.width);
    this.y = -50;
    this.speed = 2.3 + phase * 0.35;
  }

  update() { this.y += this.speed; }

  draw() {
    ctx.fillStyle = '#ff0088';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ff88ff';
    ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, 15);
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 25;
    this.height = 25;
    this.speed = 2.8;
  }

  update() { this.y += this.speed; }

  draw() {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('×2', this.x + 4, this.y + 20);
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 10 - 5;
    this.vy = Math.random() * 10 - 5;
    this.life = 35;
    this.color = color;
    this.size = Math.random() * 7 + 4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  draw() {
    ctx.globalAlpha = this.life / 35;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// ===================== FUNÇÕES AUXILIARES =====================
function createStars() {
  stars = [];
  for (let i = 0; i < 220; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.8,
      speed: Math.random() * 2.8 + 1.2
    });
  }
}

function drawBackground() {
  ctx.fillStyle = '#000011';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  for (let star of stars) {
    ctx.globalAlpha = 0.9;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    star.y += star.speed;
    if (star.y > canvas.height) star.y = 0;
  }
  ctx.globalAlpha = 1;
}

function createExplosion(x, y) {
  for (let i = 0; i < 32; i++) {
    const colors = ['#ffff00', '#ff8800', '#ff0000', '#ffaa00'];
    particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
  }
}

function saveHighscore() {
  if (!playerName) return;
  highscores.push({ name: playerName, score: score, phase: phase });
  highscores.sort((a, b) => b.score - a.score);
  highscores = highscores.slice(0, 10);
  localStorage.setItem('spaceHighscores', JSON.stringify(highscores));
}

// ===================== LOOP PRINCIPAL =====================
function gameLoop() {
  if (!gameRunning || paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  drawBackground();

  // Update e Draw
  player.update();
  player.draw();

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.y < -30) bullets.splice(i, 1);
  }

  // Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    e.draw();

    // Colisão com jogador
    if (checkCollision(e, player)) {
      lives--;
      livesEl.textContent = lives;
      createExplosion(player.x + player.width/2, player.y + player.height/2);
      enemies.splice(i, 1);
      if (lives <= 0) endGame();
      continue;
    }

    // Colisão com tiros
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (checkCollision(e, bullets[j])) {
        score += 20 + phase * 5;
        scoreEl.textContent = score;

        createExplosion(e.x + e.width/2, e.y + e.height/2);
        enemies.splice(i, 1);
        bullets.splice(j, 1);

        if (Math.random() < 0.22) {
          powerUps.push(new PowerUp(e.x + e.width/2 - 12, e.y));
        }
        break;
      }
    }

    if (e.y > canvas.height) enemies.splice(i, 1);
  }

  // PowerUps
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.update();
    p.draw();

    if (checkCollision(p, player)) {
      doubleShot = true;
      doubleShotEndTime = Date.now() + 8000;
      powerUps.splice(i, 1);
    } else if (p.y > canvas.height) {
      powerUps.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (doubleShot && Date.now() > doubleShotEndTime) doubleShot = false;

  // Avançar fase
  if (score > phase * 350) {
    phase++;
    waveEl.textContent = phase;
  }

  requestAnimationFrame(gameLoop);
}

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// ===================== CONTROLES =====================
function shoot() {
  if (!gameRunning || !player) return;

  const centerX = player.x + player.width / 2 - 3;
  bullets.push(new Bullet(centerX, player.y - 8));

  if (doubleShot) {
    bullets.push(new Bullet(centerX - 14, player.y - 2));
    bullets.push(new Bullet(centerX + 14, player.y - 2));
  }
}

window.addEventListener('keydown', e => {
  keys[e.key] = true;

  if ((e.key === ' ' || e.key === 'Spacebar') && gameRunning) {
    shoot();
    e.preventDefault();
  }

  if ((e.key === 'p' || e.key === 'P') && gameRunning) {
    paused = !paused;
  }
});

window.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('click', shoot);

// ===================== MENU =====================
document.getElementById('startBtn').addEventListener('click', () => {
  playerName = prompt("Digite seu nome:", "Jogador")?.trim() || "Jogador";
  startGame();
});

document.getElementById('rankingBtn').addEventListener('click', () => {
  let text = "🏆 TOP 10 RANKING\n\n";
  highscores.forEach((entry, i) => {
    text += `${i+1}º ${entry.name} — ${entry.score} pts (Fase ${entry.phase})\n`;
  });
  alert(highscores.length ? text : "Ainda não há recordes!");
});

document.getElementById('howToPlayBtn').addEventListener('click', () => {
  alert("Como Jogar:\n\n← → ↑ ↓ ou WASD = Mover\nEspaço ou Clique = Atirar\nP = Pausar\n\nPegue os ×2 para tiro duplo!");
});

document.getElementById('creditsBtn').addEventListener('click', () => {
  alert("🚀 SPACE SHOOTER\nDesenvolvido com HTML, CSS e JavaScript");
});

function startGame() {
  score = 0; lives = 3; phase = 1; doubleShot = false;
  bullets = []; enemies = []; particles = []; powerUps = [];

  scoreEl.textContent = '0';
  waveEl.textContent = '1';
  livesEl.textContent = '3';

  gameRunning = true;
  paused = false;

  menu.classList.remove('active');
  gameScreen.classList.add('active');
  gameInfo.style.display = 'flex';

  player = new Player();
  createStars();
  gameLoop();
  spawnEnemy();
}

function endGame() {
  gameRunning = false;
  saveHighscore();

  setTimeout(() => {
    alert(`💥 GAME OVER!\n\nFase: ${phase}\nPontuação: ${score}\n\n${playerName}, seu recorde foi salvo!`);
    menu.classList.add('active');
    gameScreen.classList.remove('active');
    gameInfo.style.display = 'none';
  }, 300);
}

function spawnEnemy() {
  if (!gameRunning || paused) return;
  enemies.push(new Enemy());
  setTimeout(spawnEnemy, Math.max(220, 920 - phase * 60));
}
