// ─── Tab switching ────────────────────────────────────────

const tabs = document.querySelectorAll('.work-tab');

function setActiveTab(category) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.category === category));
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    setActiveTab(tab.dataset.category);
    const target = document.querySelector(`.company-card[data-category="${tab.dataset.category}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ─── Lottie: play once per load ──────────────────────────

customElements.whenDefined('dotlottie-player').then(() => {
  document.querySelectorAll('dotlottie-player').forEach(player => {
    player.addEventListener('complete', () => player.stop(), { once: true });
  });
});

// ─── Scroll: hero collapse + card + shadow fade ───────────

const hero  = document.querySelector('.hero');
const cards = document.querySelectorAll('.company-card');

// Hysteresis thresholds — prevents jitter at the boundary
const COLLAPSE_AT = 60;
const EXPAND_AT   = 20;
let isCollapsed = false;
let rafPending  = false;

function setCardOpacity(card, opacity) {
  card.style.opacity = opacity < 1 ? opacity : '';
  card.querySelectorAll('.thumb-shadow, .thumb-mobile-shadow').forEach(s => {
    s.style.opacity = opacity;
  });
}

function updateScrollState() {
  rafPending = false;
  const scrollY = window.scrollY;

  // Only toggle state when crossing the correct threshold in the correct direction
  if (!isCollapsed && scrollY > COLLAPSE_AT) {
    isCollapsed = true;
    hero.classList.add('hero--collapsed');
  } else if (isCollapsed && scrollY < EXPAND_AT) {
    isCollapsed = false;
    hero.classList.remove('hero--collapsed');
  }

  const heroBottom = hero.getBoundingClientRect().bottom;
  const vh = window.innerHeight;

  // Auto-switch tab based on which category is most prominent in view
  let topmostVisibleCard = null;
  let topmostTop = Infinity;

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();

    const fadeInStart  = vh + 20;
    const fadeInEnd    = vh - 80;
    const fadeOutStart = heroBottom + 60;
    const fadeOutEnd   = heroBottom;

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
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(updateScrollState);
  }
}, { passive: true });

updateScrollState();
