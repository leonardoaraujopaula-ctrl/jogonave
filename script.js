// --- ELEMENTOS DA DOM ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');

const menu = document.getElementById('menu');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const rankingScreen = document.getElementById('rankingScreen');

const finalScoreEl = document.getElementById('finalScore');
const finalPhaseEl = document.getElementById('finalPhase');
const playerNameInput = document.getElementById('playerNameInput');

// --- VARIÁVEIS DE ESTADO ---
let score = 0, lives = 3, phase = 1;
let gameRunning = false, paused = false;

let player, bullets = [], enemies = [], particles = [], powerUps = [], stars = [];
let keys = {}, playerName = "Piloto";
let doubleShot = false, doubleShotEndTime = 0;
let highscores = JSON.parse(localStorage.getItem('spaceHighscores')) || [];
let phaseUpText = null;
let spawnTimeout = null;

// --- CLASSES ---
class Player {
  constructor() {
    this.width = 50; 
    this.height = 45;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - 70;
    this.speed = 7;
  }
  update() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;
    
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(50, Math.min(canvas.height - this.height - 10, this.y));
  }
  draw() {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(this.x + 15, this.y + 12, this.width - 30, 18);
    
    ctx.shadowBlur = 0;
  }
}

class Bullet {
  constructor(x, y, isDouble = false) {
    this.x = x; this.y = y;
    this.width = 6; this.height = 20;
    this.speed = 15; this.isDouble = isDouble;
  }
  update() { this.y -= this.speed; }
  draw() {
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.fillStyle = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

class Enemy {
  constructor() {
    this.width = 45; this.height = 35;
    this.x = Math.random() * (canvas.width - this.width);
    this.y = -40;
    this.speed = 2.0 + phase * 0.4;
    this.color = phase % 2 === 0 ? '#ff0055' : '#ff5500';
  }
  update() { this.y += this.speed; }
  draw() {
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 10, this.y + 8, this.width - 20, 10);
    ctx.shadowBlur = 0;
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.width = 25; this.height = 25;
    this.speed = 2.5;
  }
  update() { this.y += this.speed; }
  draw() {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('×2', this.x + 4, this.y + 18);
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = Math.random() * 8 - 4;
    this.vy = Math.random() * 8 - 4;
    this.life = 30;
    this.color = color;
    this.size = Math.random() * 5 + 3;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life--;
    this.vx *= 0.95; this.vy *= 0.95;
  }
  draw() {
    ctx.globalAlpha = this.life / 30;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// --- FUNÇÕES AUXILIARES ---
function createStars() {
  stars = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 2.5 + 1
    });
  }
}

function drawBackground() {
  ctx.fillStyle = '#000011';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  for (let star of stars) {
    ctx.fillRect(star.x, star.y, star.size, star.size);
    star.y += star.speed;
    if (star.y > canvas.height) star.y = 0;
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 25; i++) {
    const colors = ['#ffff00', '#ff8800', '#ff0000', '#ffaa00'];
    particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
  }
}

function showPhaseUp() {
  phaseUpText = { text: `FASE ${phase}`, alpha: 1, y: canvas.height / 2 - 20 };
}

function checkCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function saveHighscore() {
  if (!playerName) return;
  highscores.push({ name: playerName, score: score, phase: phase });
  highscores.sort((a, b) => b.score - a.score);
  highscores = highscores.slice(0, 10);
  localStorage.setItem('spaceHighscores', JSON.stringify(highscores));
}

function updateRankingScreen() {
  const list = document.getElementById('rankingList');
  list.innerHTML = '';
  if (highscores.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#888;">Nenhum recorde registrado!</p>';
    return;
  }
  highscores.forEach((entry, i) => {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${i+1}º</strong> ${entry.name} — <strong>${entry.score}</strong> pts (Fase ${entry.phase})`;
    list.appendChild(p);
  });
}

function showScreen(screen) {
  menu.classList.remove('active');
  gameScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  rankingScreen.classList.remove('active');
  screen.classList.add('active');
}

// --- LOOP DO JOGO ---
function gameLoop() {
  if (!gameRunning || paused) {
    if (gameRunning) requestAnimationFrame(gameLoop);
    return;
  }

  drawBackground();

  player.update();
  player.draw();

  // Tiros
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.y < -30) bullets.splice(i, 1);
  }

  // Inimigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    e.draw();

    // Colisão com Nave
    if (checkCollision(e, player)) {
      lives--;
      livesEl.textContent = lives;
      createExplosion(player.x + player.width/2, player.y + player.height/2);
      enemies.splice(i, 1);
      if (lives <= 0) endGame();
      continue;
    }

    // Colisão com Tiros
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (checkCollision(e, bullets[j])) {
        score += 20 + phase * 5;
        scoreEl.textContent = score;
        createExplosion(e.x + e.width/2, e.y + e.height/2);
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        if (Math.random() < 0.20) powerUps.push(new PowerUp(e.x + e.width/2 - 12, e.y));
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

  // Partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (doubleShot && Date.now() > doubleShotEndTime) doubleShot = false;

  // Mudança de Fase
  if (score >= phase * 350) {
    phase++;
    waveEl.textContent = phase;
    showPhaseUp();
  }

  // Animação de Texto de Fase
  if (phaseUpText) {
    ctx.globalAlpha = phaseUpText.alpha;
    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.fillText(phaseUpText.text, canvas.width/2, phaseUpText.y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    phaseUpText.alpha -= 0.015;
    if (phaseUpText.alpha <= 0) phaseUpText = null;
  }

  requestAnimationFrame(gameLoop);
}

function shoot() {
  if (!gameRunning || !player || paused) return;
  const center = player.x + player.width / 2 - 3;
  bullets.push(new Bullet(center, player.y - 8, doubleShot));
  if (doubleShot) {
    bullets.push(new Bullet(center - 15, player.y, true));
    bullets.push(new Bullet(center + 15, player.y, true));
  }
}

function spawnEnemy() {
  if (!gameRunning || paused) return;
  enemies.push(new Enemy());
  spawnTimeout = setTimeout(spawnEnemy, Math.max(250, 950 - phase * 65));
}

// --- GERENCIAMENTO DO JOGO ---
function startGame() {
  if (spawnTimeout) clearTimeout(spawnTimeout);

  // Captura o nome digitado na caixa de texto do menu
  playerName = playerNameInput.value.trim() || "Piloto";

  score = 0; lives = 3; phase = 1; doubleShot = false;
  bullets = []; enemies = []; particles = []; powerUps = [];

  scoreEl.textContent = '0';
  waveEl.textContent = '1';
  livesEl.textContent = '3';

  gameRunning = true;
  paused = false;

  showScreen(gameScreen);

  player = new Player();
  createStars();
  gameLoop();
  spawnEnemy();
}

function endGame() {
  gameRunning = false;
  if (spawnTimeout) clearTimeout(spawnTimeout);

  saveHighscore();

  finalScoreEl.textContent = score;
  finalPhaseEl.textContent = phase;

  setTimeout(() => {
    showScreen(gameOverScreen);
  }, 400);
}

// --- ESCUTADORES DE EVENTOS ---
window.addEventListener('keydown', e => {
  // Evita mover a nave enquanto está digitando o nome no input
  if (document.activeElement === playerNameInput) return;

  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'Spacebar') && gameRunning) {
    shoot();
    e.preventDefault();
  }
  if ((e.key === 'p' || e.key === 'P') && gameRunning) paused = !paused;
});

window.addEventListener('keyup', e => {
  if (document.activeElement === playerNameInput) return;
  keys[e.key] = false;
});

canvas.addEventListener('click', shoot);

document.getElementById('startBtn').addEventListener('click', startGame);

document.getElementById('restartBtn').addEventListener('click', startGame);

document.getElementById('gameOverMenuBtn').addEventListener('click', () => {
  showScreen(menu);
});

document.getElementById('rankingBtn').addEventListener('click', () => {
  updateRankingScreen();
  showScreen(rankingScreen);
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
  showScreen(menu);
});

document.getElementById('howToPlayBtn').addEventListener('click', () => {
  alert("🎮 COMO JOGAR:\n\n• Movimentação: Setas ou WASD\n• Disparo: Barra de Espaço ou Clique no Mouse\n• Pausa: Tecla P\n\n• Pegue os itens '×2' para ativar o Tiro Duplo!");
});

document.getElementById('creditsBtn').addEventListener('click', () => {
  alert("🚀 SPACE SHOOTER\n\nDesenvolvido com HTML5 Canvas e JavaScript!");
});
