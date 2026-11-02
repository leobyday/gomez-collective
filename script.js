// ─── Theme toggle ─────────────────────────────────────────
(function () {
  var STORAGE_KEY = 'gc-theme';
  var html = document.documentElement;

  function moonSVG() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  function sunSVG() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  function applyTheme(theme, btn) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    if (btn) btn.innerHTML = theme === 'dark' ? sunSVG() : moonSVG();
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  var saved = localStorage.getItem(STORAGE_KEY) || 'light';
  html.setAttribute('data-theme', saved);

  function injectToggle() {
    var actions = document.querySelector('.hero-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.innerHTML = saved === 'dark' ? sunSVG() : moonSVG();
    btn.setAttribute('aria-label', saved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.addEventListener('click', function () {
      var current = html.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark', btn);
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();

// ─── Shadow blur: scale proportionally to wrapper width ───

function updateShadowBlur() {
  document.querySelectorAll('.company-thumb-wrap').forEach(wrap => {
    const w = wrap.offsetWidth;
    wrap.style.setProperty('--thumb-blur',        Math.round(w * 0.05) + 'px');
    wrap.style.setProperty('--thumb-mobile-blur', Math.round(w * 0.04) + 'px');
  });
}

window.addEventListener('resize', updateShadowBlur);
updateShadowBlur();

// ─── Tab switching ────────────────────────────────────────

const tabs = document.querySelectorAll('.work-tab');

function setActiveTab(category) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.category === category));
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    setActiveTab(tab.dataset.category);
    const target = document.querySelector(`.company-card[data-category="${tab.dataset.category}"]`);
    if (!target) return;
    // Measure the actual sticky nav bottom at click time instead of relying on a static scroll-margin
    const navRow  = document.querySelector('.work-tabs-row');
    const navBottom = navRow ? navRow.getBoundingClientRect().bottom : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: targetTop - navBottom - 16, behavior: 'smooth' });
  });
});

// ─── Lottie: play after hero fade-in, stop after one loop ─

customElements.whenDefined('dotlottie-player').then(() => {
  document.querySelectorAll('dotlottie-player').forEach(player => {
    player.addEventListener('complete', () => player.stop(), { once: true });
  });
});

// Last fadeUp ends at 2.6s delay + 0.8s duration = 3.4s
setTimeout(() => {
  document.querySelectorAll('dotlottie-player').forEach(p => {
    if (typeof p.play === 'function') p.play();
  });
}, 3500);

// ─── Scroll: card opacity + shadow fade ──────────────────

const cards    = document.querySelectorAll('.company-card');
const firstCard = document.querySelector('.work-section > company-card');

let rafPending  = false;
let hasScrolled = false;

function setCardOpacity(card, opacity) {
  card.style.opacity = opacity < 1 ? opacity : '';
  card.querySelectorAll('.thumb-shadow, .thumb-mobile-shadow').forEach(s => {
    s.style.opacity = opacity;
  });
}

function updateScrollState() {
  rafPending = false;

  const navRow   = document.querySelector('.work-tabs-row');
  const navBottom = navRow ? navRow.getBoundingClientRect().bottom : 0;
  const vh = window.innerHeight;

  // Auto-switch tab based on which category is most prominent in view
  let topmostVisibleCard = null;
  let topmostTop = Infinity;

  cards.forEach(card => {
    // Keep first card hidden until user scrolls
    if (card === firstCard && !hasScrolled) {
      setCardOpacity(card, 0);
      return;
    }

    const rect = card.getBoundingClientRect();

    const fadeInStart  = vh + 20;
    const fadeInEnd    = vh - 80;
    const isSm = window.innerWidth <= 768;
    const cardMid      = rect.top + rect.height * (isSm ? 0.70 : 0.40);
    const fadeOutStart = navBottom;
    const fadeOutEnd   = navBottom - (isSm ? 120 : 60);

    let opacity;

    if (rect.top >= fadeInStart) {
      opacity = 0;
    } else if (rect.top >= fadeInEnd) {
      opacity = (fadeInStart - rect.top) / (fadeInStart - fadeInEnd);
    } else if (cardMid <= fadeOutStart) {
      opacity = Math.max(0, (cardMid - fadeOutEnd) / (fadeOutStart - fadeOutEnd));
    } else {
      opacity = 1;
    }

    setCardOpacity(card, opacity);

    // Track the topmost card that's meaningfully in view
    if (opacity > 0.5 && rect.top < topmostTop) {
      topmostTop = rect.top;
      topmostVisibleCard = card;
    }
  });

  if (topmostVisibleCard) {
    setActiveTab(topmostVisibleCard.dataset.category);
  }
}

window.addEventListener('scroll', () => {
  hasScrolled = true;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(updateScrollState);
  }
}, { passive: true });

updateScrollState();

// ─── Password gate ────────────────────────────────────────

function attachPwGate(trigger) {
  const href = trigger.dataset.href;

  trigger.addEventListener('click', () => {
    const wrap = document.createElement('span');
    wrap.className = 'pw-gate';

    const input = document.createElement('input');
    input.type        = 'password';
    input.className   = 'pw-gate__input';
    input.placeholder = 'Enter password';

    wrap.appendChild(input);
    trigger.replaceWith(wrap);
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const replacement = document.createElement('span');
        replacement.className = 'view-more js-pw-gate';
        replacement.dataset.href = href;
        replacement.textContent = 'Enter password';
        wrap.replaceWith(replacement);
        attachPwGate(replacement);
        return;
      }
      if (e.key !== 'Enter') return;
      if (input.value.toLowerCase() === 'recent') {
        sessionStorage.setItem('sym_auth', '1');
        window.location.href = href;
      } else {
        wrap.classList.add('pw-gate--shake');
        input.value = '';
        setTimeout(() => wrap.classList.remove('pw-gate--shake'), 400);
      }
    });
  });
}

document.querySelectorAll('.js-pw-gate').forEach(attachPwGate);
