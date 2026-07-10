/**
 * <company-card> — Portfolio entry card
 *
 * Attributes
 * ----------
 * name          Company name (required)
 * category      Tag line shown above the bio
 * bio           Short description
 * lang          Tech/language tags shown below the bio (design-engineering cards)
 * href          Case-study or external URL  (omit → no VIEW MORE)
 * site          External URL             (omit → no VISIT SITE)
 * data-category Filter bucket: "startups" | "consumer" | "design-engineering"
 * thumb         Thumbnail variant: "fit" | "media" | "phones" | "lottie" | "spotify" | "phone-only"
 * access        "locked" (UPON REQUEST) | "password" (Enter password) | omit (VIEW MORE)
 *
 * Default slot: thumbnail content (img / video / dotlottie-player).
 * The host element receives class="company-card" so all existing CSS and JS selectors
 * in style.css and script.js continue to work without modification.
 */

class CompanyCard extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'category', 'bio', 'lang', 'href', 'site', 'thumb', 'access', 'badge'];
  }

  connectedCallback() {
    this.classList.add('company-card');
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  _render() {
    const name     = this.getAttribute('name')     ?? '';
    const category = this.getAttribute('category') ?? '';
    const bio      = this.getAttribute('bio')       ?? '';
    const lang     = this.getAttribute('lang')      ?? '';
    const href     = this.getAttribute('href');
    const site     = this.getAttribute('site');
    const thumb    = this.getAttribute('thumb')    ?? 'media';
    const access   = this.getAttribute('access');
    const badge    = this.getAttribute('badge');

    // Capture slotted thumbnail HTML before wiping innerHTML
    const slottedHTML = this._slottedHTML ?? this.innerHTML.trim();
    this._slottedHTML = slottedHTML;

    // Shadow element: not needed for lottie/spotify/phones/phone-only layouts
    const noShadow = ['lottie', 'spotify', 'phones', 'phone-only'].includes(thumb);

    // href opens in new tab if it's an external URL
    const isExternal = href && href.startsWith('http');

    this.innerHTML = `
      <div class="company-desc">
        <h2 class="company-name">${name}${badge ? `<span class="company-badge">${badge}</span>` : ''}</h2>
        ${category ? `<p class="company-category">${category}</p>` : ''}
        ${bio      ? `<p class="company-bio">${bio}</p>`           : ''}
        ${lang     ? `<p class="company-lang">${lang}</p>`         : ''}
        ${(href || access) ? `<div class="company-divider"></div>${this._ctaHTML(href, access, isExternal)}` : ''}
      </div>
      <div class="company-right">
        <div class="company-thumb-wrap company-thumb-wrap--${thumb}">
          ${noShadow ? '' : '<div class="thumb-shadow"></div>'}
          ${slottedHTML}
        </div>
        ${site ? this._visitSiteHTML(site) : ''}
      </div>
    `;
  }

  _ctaHTML(href, access, isExternal) {
    if (access === 'locked') {
      return `<span class="view-more view-more--locked">UPON REQUEST</span>`;
    }
    if (access === 'password') {
      return `<span class="view-more js-pw-gate" data-href="${href ?? ''}">Enter password</span>`;
    }
    if (href) {
      const attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${href}" class="view-more"${attrs}>VIEW MORE</a>`;
    }
    return '';
  }

  _visitSiteHTML(url) {
    return `
      <div class="visit-site-row">
        <a href="${url}" class="visit-site-link" target="_blank" rel="noopener">
          VISIT SITE
          <svg class="visit-arrow" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 15L15 5M15 5H7M15 5V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>`;
  }
}

customElements.define('company-card', CompanyCard);
