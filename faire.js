const slides     = Array.from(document.querySelectorAll('.slide'));
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const counter    = document.getElementById('slideCounter');
const presentBtn = document.getElementById('presentBtn');

const total = slides.length;
let current = 0;

function goTo(index) {
  slides[current].classList.remove('is-active');
  current = index;
  slides[current].classList.add('is-active');

  counter.textContent = `${current + 1} / ${total}`;
  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === total - 1;
}

// Init
slides[0].classList.add('is-active');
prevBtn.disabled = true;

prevBtn.addEventListener('click', () => { if (current > 0) goTo(current - 1); });
nextBtn.addEventListener('click', () => { if (current < total - 1) goTo(current + 1); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (current < total - 1) goTo(current + 1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (current > 0) goTo(current - 1);
  }
});

presentBtn.addEventListener('click', () => {
  const el = document.documentElement;
  if (el.requestFullscreen)            el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});
