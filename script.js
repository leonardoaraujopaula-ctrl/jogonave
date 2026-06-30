const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const menu = document.getElementById('menu');
const gameInfo = document.getElementById('gameInfo');

let score = 0, lives = 3, phase = 1, gameRunning = false, paused = false;
let player, bullets = [], enemies = [], particles = [], stars = [], powerUps = [];
let keys = {};
let playerName = "";
let doubleShot = false;
let doubleShotTime = 0;
let highscores = JSON.parse(localStorage.getItem('spaceHighscores')) || [];

// ===================== SONS =====================
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playShootSound() {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
}

function playExplosionSound() {
  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.6, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  noise.start();
}

function playPowerUpSound() {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.4);
  gain.gain.setValueAtTime(0.4, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.5);
}

// ===================== CLASSES =====================
class Player {
  constructor() {
    this.width = 60; this.height = 55;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - 100;
    this.speed = 7;
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
  update() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    this.y = Math.max(50, Math.min(canvas.height - this.height - 20, this.y));
  }
}

class Bullet {
  constructor(x, y, isDouble = false) {
    this.x = x; this.y = y;
    this.width = 6; this.height = 20;
    this.speed = 15;
    this.isDouble = isDouble;
  }
  update() { this.y -= this.speed; }
  draw() {
    ctx.fillStyle = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.isDouble ? '#ff00ff' : '#ffff00';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Enemy {
  constructor() {
    this.width = 50; this.height = 40;
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
    this.x = x; this.y = y;
    this.width = 25; this.height = 25;
    this.speed = 2.5;
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
    this.x = x; this.y = y;
    this.vx = Math.random() * 10 - 5;
    this.vy = Math.random() * 10 - 5;
    this.life = 30;
    this.color = color;
    this.size = Math.random() * 8 + 4;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life--;
    this.vx *= 0.96; this.vy *= 0.96;
  }
  draw() {
    ctx.globalAlpha = this.life / 30;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// ===================== FUNÇÕES =====================
function createStars() {
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*2.5+1, speed: Math.random()*2.8+1});
  }
}

function drawBackground() {
  ctx.fillStyle = '#000011';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  for (let star of stars) {
    ctx.globalAlpha = 0.8;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    star.y += star.speed;
    if (star.y > canvas.height) star.y = 0;
  }
  ctx.globalAlpha = 1;
}

function createExplosion(x, y) {
  for (let i = 0; i < 28; i++) {
    particles.push(new Particle(x, y, ['#ffff00', '#ff8800', '#ff0000'][Math.floor(Math.random()*3)]));
  }
}

function saveHighscore() {
  highscores.push({ name: playerName, score: score, phase: phase });
  highscores.sort((a, b) => b.score - a.score);
  highscores = highscores.slice(0, 10);
  localStorage.setItem('spaceHighscores', JSON.stringify(highscores));
}

function draw() {
  drawBackground();
  if (player) player.update();
  if (player) player.draw();

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.y < -30) bullets.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    e.draw();

    if (player && e.y + e.height > player.y && e.x < player.x + player.width && e.x + e.width > player.x) {
      lives--;
      livesEl.textContent = lives;
      createExplosion(player.x + player.width/2, player.y);
      playExplosionSound();
      enemies.splice(i, 1);
      if (lives <= 0) endGame();
      continue;
    }

    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        score += 20 + phase * 5;
        scoreEl.textContent = score;
        createExplosion(e.x + e.width/2, e.y + e.height/2);
        playExplosionSound();
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        if (Math.random() < 0.18) powerUps.push(new PowerUp(e.x + e.width/2, e.y));
        break;
      }
    }
    if (e.y > canvas.height) enemies.splice(i, 1);
  }

  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.update();
    p.draw();
    if (player && p.x < player.x + player.width && p.x + p.width > player.x &&
        p.y < player.y + player.height && p.y + p.height > player.y) {
      doubleShot = true;
      doubleShotTime = Date.now() + 8000;
      playPowerUpSound();
      powerUps.splice(i, 1);
      continue;
    }
    if (p.y > canvas.height) powerUps.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (doubleShot && Date.now() > doubleShotTime) doubleShot = false;
}

function gameLoop() {
  if (!gameRunning || paused) return;
  draw();

  if (score > phase * 300) {
    phase++;
    waveEl.textContent = phase;
  }

  requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  if (!gameRunning || paused) return;
  enemies.push(new Enemy());
  setTimeout(spawnEnemy, Math.max(250, 950 - phase * 55));
}

function shoot() {
  if (!gameRunning || !player) return;
  playShootSound();
  const center = player.x + player.width / 2 - 3;
  bullets.push(new Bullet(center, player.y - 5));
  if (doubleShot) {
    bullets.push(new Bullet(center - 12, player.y));
    bullets.push(new Bullet(center + 12, player.y));
  }
}

// ===================== CONTROLES =====================
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === 'p' || e.key === 'P') && gameRunning) paused = !paused;
});
window.addEventListener('keyup', e => keys[e.key] = false);

canvas.addEventListener('click', shoot);
document.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Spacebar') && gameRunning) {
    shoot();
    e.preventDefault();
  }
});

// ===================== MENU =====================
document.getElementById('startBtn').addEventListener('click', () => {
  playerName = prompt("Digite seu nome para o ranking:", "Jogador") || "Jogador";
  startGame();
});

document.getElementById('rankingBtn').addEventListener('click', () => {
  let text = "🏆 TOP 10 RANKING\n\n";
  highscores.forEach((entry, i) => {
    text += `${i+1}. ${entry.name} — ${entry.score} pts (Fase ${entry.phase})\n`;
  });
  if (highscores.length === 0) text += "Ainda não há recordes!";
  alert(text);
});

document.getElementById('howToPlayBtn').addEventListener('click', () => {
  alert("Como Jogar:\n↑ ↓ ← → ou WASD = Mover\nEspaço ou Clique = Atirar\nP = Pausar\n\nPegue os ×2 verdes!");
});

document.getElementById('creditsBtn').addEventListener('click', () => {
  alert("🚀 SPACE SHOOTER\nFeito com HTML, CSS e JavaScript");
});

function startGame() {
  score = 0; lives = 3; phase = 1; doubleShot = false;
  bullets = []; enemies = []; particles = []; powerUps = [];
  
  scoreEl.textContent = '0';
  waveEl.textContent = '1';
  livesEl.textContent = '3';
  
  gameRunning = true;
  paused = false;
  menu.style.display = 'none';
  gameInfo.style.display = 'flex';
  
  player = new Player();
  createStars();
  spawnEnemy();
  gameLoop();
}

function endGame() {
  gameRunning = false;
  saveHighscore();
  alert(`💥 GAME OVER!\n\nFase: ${phase}\nPontuação: ${score}\n\n${playerName}, seu recorde foi salvo!`);
  menu.style.display = 'flex';
  gameInfo.style.display = 'none';
}

function saveHighscore() {
  highscores.push({ name: playerName, score: score, phase: phase });
  highscores.sort((a, b) => b.score - a.score);
  highscores = highscores.slice(0, 10);
  localStorage.setItem('spaceHighscores', JSON.stringify(highscores));
}
