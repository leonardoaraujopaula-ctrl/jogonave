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
let backgroundMusicInterval = null;

// ===================== MÚSICA DE FUNDO (Estilo Jogo Retrô) =====================
function playBackgroundMusic() {
  if (backgroundMusicInterval) return;
  
  let noteIndex = 0;
  const melody = [262, 294, 330, 349, 392, 440, 494, 523]; // Notas musicais (C4 a C5)
  
  backgroundMusicInterval = setInterval(() => {
    if (!gameRunning) return;
    
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(melody[noteIndex % melody.length], audioContext.currentTime);
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    noteIndex++;
  }, 280); // Velocidade da melodia
}

function stopBackgroundMusic() {
  if (backgroundMusicInterval) {
    clearInterval(backgroundMusicInterval);
    backgroundMusicInterval = null;
  }
}

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
class Player { /* mesmo código anterior */ }
class Bullet { /* mesmo */ }
class Enemy { /* mesmo */ }
class PowerUp { /* mesmo */ }
class Particle { /* mesmo */ }

// ===================== FUNÇÕES =====================
function createStars() { /* mesmo */ }
function drawBackground() { /* mesmo */ }
function createExplosion(x, y) { /* mesmo */ }

function saveHighscore() { /* mesmo */ }

function draw() { /* mesmo código com os sons */ 
  // ... (mantenha o draw anterior)
  // Na colisão com tiro: playExplosionSound();
  // No power-up: playPowerUpSound();
}

function gameLoop() { /* mesmo */ }

function spawnEnemy() { /* mesmo */ }

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
  alert("Como Jogar:\n↑ ↓ ← → ou WASD = Mover\nEspaço ou Clique = Atirar\nP = Pausar");
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
  playBackgroundMusic();   // ← Inicia a música
  gameLoop();
}

function endGame() {
  gameRunning = false;
  stopBackgroundMusic();   // ← Para a música
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
