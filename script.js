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

const bossHealthContainer = document.getElementById('bossHealthContainer');
const bossHealthBar = document.getElementById('bossHealthBar');

// --- VARIÁVEIS DE ESTADO ---
let score = 0, lives = 3, phase = 1;
let gameRunning = false, paused = false;

let player, bullets = [], enemyBullets = [], enemies = [], particles = [], powerUps = [], stars = [];
let activeBoss = null;
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

class EnemyBullet {
  constructor(x, y, vx = 0, vy = 5) {
    this.x = x; this.y = y;
    this.width = 8; this.height = 14;
    this.vx = vx; this.vy = vy;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  draw() {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0000';
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

class Enemy {
  constructor() {
    this.width = 45; this.height = 35;
    this.x = Math.random() * (canvas.width - this.width);
    this.y = -40;
    this.speed = 2.0 + phase * 0.3;
    
    // Tipos de Inimigos
    const rand = Math.random();
    if (rand < 0.4) {
      this.type = 'NORMAL';
      this.color = '#ff0055';
    } else if (rand < 0.7) {
      this.type = 'ZIGZAG';
      this.color = '#ffff00';
      this.startX = this.x;
      this.angle = 0;
    } else {
      this.type = 'SHOOTER';
      this.color = '#0088ff';
      this.lastShot = Date.now();
    }
  }
  update() {
    this.y += this.speed;

    if (this.type === 'ZIGZAG') {
      this.angle += 0.05;
      this.x = this.startX + Math.sin(this.angle) * 60;
      this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    } else if (this.type === 'SHOOTER') {
      if (Date.now() - this.lastShot > 1800) {
        enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - 4, this.y + this.height));
        this.lastShot = Date.now();
      }
    }
  }
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

class Boss {
  constructor() {
    this.width = 160;
    this.height = 90;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = -100;
    this.targetY = 70;
    this.maxHealth = 100 + phase * 40;
    this.health = this.maxHealth;
    this.speedX = 3;
    this.lastShot = Date.now();
  }
  update() {
    // Entrando na tela
    if (this.y < this.targetY) {
      this.y += 2;
      return;
    }

    // Movimento Lateral
    this.x += this.speedX;
    if (this.x <= 0 || this.x + this.width >= canvas.width) {
      this.speedX *= -1;
    }

    // Ataque triplo do Boss
    if (Date.now() - this.lastShot > 1400) {
      const centerX = this.x + this.width / 2;
      const bottomY = this.y + this.height;
      enemyBullets.push(new EnemyBullet(centerX - 30, bottomY, -2, 5));
      enemyBullets.push(new EnemyBullet(centerX, bottomY, 0, 6));
      enemyBullets.push(new EnemyBullet(centerX + 30, bottomY, 2, 5));
      this.lastShot = Date.now();
    }
  }
  draw() {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#aa0033';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = '#ff0055';
    ctx.fillRect(this.x + 20, this.y + 20, this.width - 40, this.height - 40);

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(this.x + this.width / 2 - 15, this.y + this.height - 20, 30, 15);
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

function createExplosion(x, y, count = 25) {
  for (let i = 0; i < count; i++) {
    const colors = ['#ffff00', '#ff8800', '#ff0000', '#ffaa00', '#00ffff'];
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

function updateBossBar() {
  if (activeBoss) {
    bossHealthContainer.classList.remove('hidden');
    const pct = Math.max(0, (activeBoss.health / activeBoss.maxHealth) * 100);
    bossHealthBar.style.width = `${pct}%`;
  } else {
    bossHealthContainer.classList.add('hidden');
  }
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

  // Tiros do Jogador
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.y < -30) bullets.splice(i, 1);
  }

  // Tiros dos Inimigos
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.update();
    eb.draw();

    if (checkCollision(eb, player)) {
      lives--;
      livesEl.textContent = lives;
      createExplosion(player.x + player.width/2, player.y + player.height/2);
      enemyBullets.splice(i, 1);
      if (lives <= 0) endGame();
      continue;
    }

    if (eb.y > canvas.height || eb.x < 0 || eb.x > canvas.width) {
      enemyBullets.splice(i, 1);
    }
  }

  // Processa Boss se Existir
  if (activeBoss) {
    activeBoss.update();
    activeBoss.draw();
    updateBossBar();

    // Colisão do Jogador com Boss
    if (checkCollision(activeBoss, player)) {
      lives--;
      livesEl.textContent = lives;
      createExplosion(player.x + player.width/2, player.y + player.height/2);
      if (lives <= 0) endGame();
    }

    // Colisão do Tiro no Boss
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (checkCollision(activeBoss, bullets[j])) {
        activeBoss.health -= 10;
        createExplosion(bullets[j].x, bullets[j].y, 5);
        bullets.splice(j, 1);

        if (activeBoss.health <= 0) {
          score += 1500;
          scoreEl.textContent = score;
          createExplosion(activeBoss.x + activeBoss.width/2, activeBoss.y + activeBoss.height/2, 60);
          activeBoss = null;
          updateBossBar();
          
          // Avança a fase após derrotar o Boss
          phase++;
          waveEl.textContent = phase;
          showPhaseUp();
          break;
        }
      }
    }
  } else {
    // Inimigos Normais
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.update();
      e.draw();

      if (checkCollision(e, player)) {
        lives--;
        livesEl.textContent = lives;
        createExplosion(player.x + player.width/2, player.y + player.height/2);
        enemies.splice(i, 1);
        if (lives <= 0) endGame();
        continue;
      }

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

  // Mudança de Fase (Caso não seja fase de Boss)
  if (!activeBoss && phase % 3 !== 0 && score >= phase * 350) {
    phase++;
    waveEl.textContent = phase;
    showPhaseUp();
  }

  // Animação do Texto de Fase
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

  // Se a fase for múltipla de 3 e não houver Boss ativo, gera o Boss
  if (phase % 3 === 0 && !activeBoss) {
    enemies = []; // Limpa inimigos normais
    activeBoss = new Boss();
  } 

  // Gera inimigos normais se não houver Boss ativo
  if (!activeBoss) {
    enemies.push(new Enemy());
  }

  spawnTimeout = setTimeout(spawnEnemy, Math.max(250, 950 - phase * 60));
}

// --- GERENCIAMENTO DO JOGO ---
function startGame() {
  if (spawnTimeout) clearTimeout(spawnTimeout);

  playerName = playerNameInput.value.trim() || "Piloto";

  score = 0; lives = 3; phase = 1; doubleShot = false;
  bullets = []; enemyBullets = []; enemies = []; particles = []; powerUps = [];
  activeBoss = null;

  scoreEl.textContent = '0';
  waveEl.textContent = '1';
  livesEl.textContent = '3';

  updateBossBar();

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
  alert("🎮 COMO JOGAR:\n\n• Movimentação: Setas ou WASD\n• Disparo: Barra de Espaço ou Clique\n• Pausa: Tecla P\n\n• CUIDADO: Inimigos azuis e Chefões atiram de volta!\n• Pegue os itens '×2' para ativar o Tiro Duplo.");
});

document.getElementById('creditsBtn').addEventListener('click', () => {
  alert("🚀 SPACE SHOOTER\n\nDesenvolvido com HTML5 Canvas e JavaScript!");
});
