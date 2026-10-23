const canvas = document.querySelector('.matrix');
const context = canvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let columns = [];
let matrixTimer;
let width = 0;
let height = 0;
const glyphs = 'アカサタナハマヤラワ0123456789<>/{}*';

function resizeMatrix() {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  columns = Array.from({ length: Math.ceil(width / 32) }, () => Math.random() * -30);
  if (reducedMotion) drawMatrix();
}

function drawMatrix() {
  context.fillStyle = 'rgba(8, 11, 10, 0.2)';
  context.fillRect(0, 0, width, height);
  context.font = '11px monospace';
  columns.forEach((y, i) => {
    context.fillStyle = Math.random() > 0.97 ? 'rgba(187,255,106,.7)' : 'rgba(81,137,91,.35)';
    context.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 32, y * 18);
    if (y * 18 > height && Math.random() > 0.975) columns[i] = 0;
    columns[i] += reducedMotion ? 0 : 0.65;
  });
}

function startMatrix() {
  if (!reducedMotion && !document.hidden && !matrixTimer) matrixTimer = window.setInterval(drawMatrix, 100);
}
function stopMatrix() {
  window.clearInterval(matrixTimer);
  matrixTimer = undefined;
}
resizeMatrix();
startMatrix();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopMatrix();
  else { drawMatrix(); startMatrix(); }
});
window.addEventListener('resize', () => {
  resizeMatrix();
  drawMatrix();
});

const orb = document.querySelector('#orb');
const stage = document.querySelector('.visual-stage');
if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    orb.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`;
  });
  stage.addEventListener('pointerleave', () => { orb.style.transform = ''; });
}

const phrases = ['building things that matter', 'always learning something new', 'making the internet more human'];
const typed = document.querySelector('#typed');
let phrase = 0;
let character = phrases[0].length;
let deleting = true;
function typeLoop() {
  const current = phrases[phrase];
  if (deleting) {
    character--;
    typed.textContent = current.slice(0, character);
    if (character <= 0) { deleting = false; phrase = (phrase + 1) % phrases.length; }
    window.setTimeout(typeLoop, 36);
  } else {
    const next = phrases[phrase];
    character++;
    typed.textContent = next.slice(0, character);
    if (character >= next.length) {
      deleting = true;
      window.setTimeout(typeLoop, 1900);
    } else window.setTimeout(typeLoop, 58);
  }
}
if (!reducedMotion) window.setTimeout(typeLoop, 2200);
document.querySelector('#year').textContent = new Date().getFullYear();
