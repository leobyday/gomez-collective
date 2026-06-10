// ─── Case study carousel (scoped per group) ───────────

function restartAnimations(panel) {
  panel.querySelectorAll('.case-cycle-modal, .case-cycle-img').forEach(img => {
    img.style.animation = 'none';
    img.offsetHeight;
    img.style.animation = '';
  });
}

document.querySelectorAll('.case-carousel-group').forEach(group => {
  const subnav = group.querySelectorAll('.case-subnav-btn');
  const panels = group.querySelectorAll('.case-carousel-panel');

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

  if (subnav.length) showPanel(subnav[0].dataset.view);
});

// ─── Lightbox ────────────────────────────────────────

const lightbox = document.createElement('div');
lightbox.className = 'lightbox-overlay';
lightbox.innerHTML = '<img class="lightbox-img" src="" alt="">';
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector('.lightbox-img');

function openLightbox(img) {
  const rect = img.getBoundingClientRect();
  const targetW = rect.width * 2;
  const targetH = rect.height * 2;
  const maxW = window.innerWidth * 0.92;
  const maxH = window.innerHeight * 0.92;
  const scale = Math.min(maxW / targetW, maxH / targetH, 1);
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '';
  lightboxImg.style.width = Math.round(targetW * scale) + 'px';
  lightboxImg.style.height = 'auto';
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  lightboxImg.style.width = '';
  document.body.style.overflow = '';
}

lightbox.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

document.querySelectorAll('.case-carousel-img').forEach(img => {
  const wrap = document.createElement('div');
  wrap.className = 'zoom-wrap';
  img.parentNode.insertBefore(wrap, img);
  wrap.appendChild(img);

  const btn = document.createElement('button');
  btn.className = 'zoom-btn';
  btn.setAttribute('aria-label', 'Enlarge image');
  btn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="4"/><line x1="9.5" y1="9.5" x2="14" y2="14"/></svg>';
  wrap.appendChild(btn);

  wrap.addEventListener('click', () => openLightbox(img));
});

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
