// ─── Case study carousel ──────────────────────────────

const subnav = document.querySelectorAll('.case-subnav-btn');
const panels = document.querySelectorAll('.case-carousel-panel');

function restartAnimations(panel) {
  panel.querySelectorAll('.case-cycle-modal, .case-cycle-img').forEach(img => {
    img.style.animation = 'none';
    img.offsetHeight; // force reflow
    img.style.animation = '';
  });
}

function showPanel(view) {
  subnav.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  panels.forEach(panel => {
    const isActive = panel.dataset.view === view;
    panel.classList.toggle('active', isActive);
    if (isActive) {
      restartAnimations(panel);
      panel.querySelectorAll('video').forEach(v => v.play());
    } else {
      panel.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; });
    }
  });
}

subnav.forEach(btn => {
  btn.addEventListener('click', () => showPanel(btn.dataset.view));
});

// Activate first tab on load
if (subnav.length) showPanel(subnav[0].dataset.view);

// ─── Chrome Extension dark/light toggle ──────────────

const chromeModebtns = document.querySelectorAll('.chrome-mode-btn');
const chromePanels = document.querySelectorAll('.chrome-mode-panel');

chromeModebtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    chromeModebtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    chromePanels.forEach(p => p.classList.toggle('active', p.dataset.mode === mode));
  });
});
