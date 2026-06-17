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

// ─── Research triptych: fade in once on scroll ───────

const triptych = document.querySelector('.dp-research-triptych');
if (triptych) {
  const ioT = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      triptych.classList.add('in-view');
      ioT.disconnect();
    }
  }, { threshold: 0.25 });
  ioT.observe(triptych);
}

// ─── Content pipeline diagram: animate on scroll ─────

const pipeline = document.querySelector('.disney-pipeline');
if (pipeline) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      pipeline.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { threshold: 0.3 });
  io.observe(pipeline);
}

// ─── Lightbox ────────────────────────────────────────

const lightbox = document.createElement('div');
lightbox.className = 'lightbox-overlay';
lightbox.innerHTML = '<img class="lightbox-img" src="" alt="">';
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector('.lightbox-img');

function openLightbox(img) {
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '';
  lightboxImg.style.width = '';
  lightboxImg.style.height = '';
  const setNaturalSize = () => {
    lightboxImg.style.width  = lightboxImg.naturalWidth  + 'px';
    lightboxImg.style.height = lightboxImg.naturalHeight + 'px';
  };
  if (lightboxImg.naturalWidth) {
    setNaturalSize();
  } else {
    lightboxImg.addEventListener('load', setNaturalSize, { once: true });
  }
  lightbox.classList.add('active');
  lightbox.scrollTop = 0;
  lightbox.scrollLeft = 0;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  lightboxImg.style.width = '';
  document.body.style.overflow = '';
}

let _lbDragging = false;
let _lbStartX = 0, _lbStartY = 0;
lightbox.addEventListener('mousedown', e => { _lbStartX = e.clientX; _lbStartY = e.clientY; _lbDragging = false; });
lightbox.addEventListener('mousemove', e => { if (Math.abs(e.clientX - _lbStartX) > 4 || Math.abs(e.clientY - _lbStartY) > 4) _lbDragging = true; });
lightbox.addEventListener('click', () => { if (!_lbDragging) closeLightbox(); });
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

// ─── Shadow loads after hero image ───────────────────

document.querySelectorAll('.case-hero-img-wrap').forEach(wrap => {
  const shadow = wrap.querySelector('.case-hero-shadow');
  if (!shadow) return;
  const media = wrap.querySelector('img, video');
  if (!media) return;
  if (media.tagName === 'IMG') {
    if (media.complete && media.naturalWidth) {
      shadow.classList.add('loaded');
    } else {
      media.addEventListener('load', () => shadow.classList.add('loaded'), { once: true });
    }
  } else {
    media.addEventListener('loadeddata', () => shadow.classList.add('loaded'), { once: true });
    if (media.readyState >= 2) shadow.classList.add('loaded');
  }
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
