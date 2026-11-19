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
    const navRow  = document.querySelector('.work-tabs-row');
    const navHeight = navRow ? navRow.offsetHeight : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: targetTop - navHeight - 32, behavior: 'smooth' });
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

// ─── Card reveal (GSAP) + gradient mask exit ─────────────

gsap.registerPlugin(ScrollTrigger);

const cards = document.querySelectorAll('.company-card');

// Cards start invisible — GSAP reveals each one as it enters the viewport
gsap.set(cards, { opacity: 0 });

cards.forEach(card => {
  gsap.to(card, {
    opacity: 1,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: card,
      start: 'top 92%',
      toggleActions: 'play none none none',
    }
  });
});

// Exit: as a card scrolls up past the sticky nav, a gradient mask wipes
// from the top — the top edge fades first so it never overlaps the subnav,
// then the rest of the card disappears as it continues scrolling off.
let rafPending = false;

function updateScrollState() {
  rafPending = false;

  const navRow    = document.querySelector('.work-tabs-row');
  const navBottom = navRow ? navRow.getBoundingClientRect().bottom : 0;

  let topmostVisibleCard = null;
  let topmostTop         = Infinity;

  cards.forEach(card => {
    const rect  = card.getBoundingClientRect();
    const cardH = rect.height || 1;

    // How many px of the card's top are above the nav bottom edge
    const overlap = navBottom - rect.top;

    if (overlap <= 0) {
      // Card is fully below the nav — clear any mask
      card.style.maskImage        = '';
      card.style.webkitMaskImage  = '';
      card.querySelectorAll('.thumb-shadow, .thumb-mobile-shadow')
          .forEach(s => { s.style.opacity = ''; });

      if (rect.top < topmostTop && rect.bottom > navBottom) {
        topmostTop = rect.top;
        topmostVisibleCard = card;
      }
      return;
    }

    if (overlap >= cardH) {
      // Card is fully past the nav — hide entirely
      const gone = 'linear-gradient(to bottom, transparent 100%, black 100%)';
      card.style.maskImage        = gone;
      card.style.webkitMaskImage  = gone;
      card.querySelectorAll('.thumb-shadow, .thumb-mobile-shadow')
          .forEach(s => { s.style.opacity = '0'; });
      return;
    }

    // Partial: top of card is past nav, bottom is still below it.
    // Gradient: transparent from card-top to navBottom, then a soft edge,
    // then fully visible for the rest of the card.
    const overlapPct = (overlap / cardH) * 100;
    const softPct    = Math.min((80 / cardH) * 100, 18); // soft edge, capped at 18%
    const mask = `linear-gradient(to bottom, transparent ${overlapPct.toFixed(1)}%, black ${Math.min(overlapPct + softPct, 100).toFixed(1)}%)`;

    card.style.maskImage        = mask;
    card.style.webkitMaskImage  = mask;

    // Shadows fade out as the card exits
    const shadowOp = Math.max(0, 1 - overlap / (cardH * 0.45)).toFixed(3);
    card.querySelectorAll('.thumb-shadow, .thumb-mobile-shadow')
        .forEach(s => { s.style.opacity = shadowOp; });

    // Tab tracking: use the card that still has the most visible content
    if (overlap < cardH * 0.5 && rect.top < topmostTop) {
      topmostTop = rect.top;
      topmostVisibleCard = card;
    }
  });

  if (topmostVisibleCard) {
    setActiveTab(topmostVisibleCard.dataset.category);
  }
}

window.addEventListener('scroll', () => {
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
