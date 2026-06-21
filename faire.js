const slides     = Array.from(document.querySelectorAll('.slide'));
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const counter    = document.getElementById('slideCounter');
const presentBtn = document.getElementById('presentBtn');
const notesBtn   = document.getElementById('notesBtn');

const total = slides.length;
let current = 0;
let step = 0;

// Extra click steps per slide before advancing (index = slide index)
// Slide 3 (idx 2): 1 step — reveal Roku work card
// Slide 4 (idx 3): 1 step — reveal Roku why-column
// Slide 5 (idx 4): 3 steps — reveal deepdive cells 2, 3, 4
// Slide 7 (idx 6): 3 steps — reveal deepdive cells 2, 3, 4
const extraSteps = [0, 0, 1, 1, 3, 0, 3, 0, 0];

const workReveal = document.querySelectorAll('.work-reveal');
const whyReveal  = document.querySelectorAll('.why-reveal');

function onStepEnter(slideIndex, s) {
  if (slideIndex === 2) {
    workReveal.forEach(el => el.classList.toggle('is-visible', s >= 1));
  }
  if (slideIndex === 3) {
    whyReveal.forEach(el => el.classList.toggle('is-visible', s >= 1));
  }
  if (slideIndex === 4 || slideIndex === 6) {
    slides[slideIndex].querySelectorAll('.cell-hidden').forEach((cell, i) => {
      cell.classList.toggle('cell-visible', i < s);
    });
  }
  localStorage.setItem('faire-current', slideIndex);
  localStorage.setItem('faire-step', s);
}

function updateButtons() {
  const atStart = current === 0 && step === 0;
  const atEnd   = current === total - 1 && step >= extraSteps[current];
  prevBtn.disabled = atStart;
  nextBtn.disabled = atEnd;
  counter.textContent = `${current + 1} / ${total}`;
}

function goTo(index) {
  slides[current].classList.remove('is-active');
  step = 0;
  current = index;
  onStepEnter(current, step);
  slides[current].classList.add('is-active');
  updateButtons();
}

function advance() {
  if (step < extraSteps[current]) {
    step++;
    onStepEnter(current, step);
    updateButtons();
  } else if (current < total - 1) {
    goTo(current + 1);
  }
}

function retreat() {
  if (step > 0) {
    step--;
    onStepEnter(current, step);
    updateButtons();
  } else if (current > 0) {
    goTo(current - 1);
  }
}

// Init
slides[0].classList.add('is-active');
onStepEnter(0, 0);
updateButtons();

prevBtn.addEventListener('click', retreat);
nextBtn.addEventListener('click', advance);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance();
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') retreat();
});

presentBtn.addEventListener('click', () => {
  const el = document.documentElement;
  if (el.requestFullscreen)            el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});

notesBtn.addEventListener('click', () => {
  window.open('faire-notes.html', 'faire-notes', 'width=640,height=520,resizable=yes');
});
