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
    const fadeOutStart = navBottom + 60;
    const fadeOutEnd   = navBottom;

    let opacity;

    if (rect.top >= fadeInStart) {
      opacity = 0;
    } else if (rect.top >= fadeInEnd) {
      opacity = (fadeInStart - rect.top) / (fadeInStart - fadeInEnd);
    } else if (rect.bottom <= fadeOutStart) {
      opacity = Math.max(0, (rect.bottom - fadeOutEnd) / (fadeOutStart - fadeOutEnd));
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
