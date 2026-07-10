;(function () {
  'use strict'

  var ALPHA          = 'abcdefghijklmnopqrstuvwxyz'
  var SWAP_MS        = 52
  var COLOR_GRAY     = '#BFBDB3'
  var COLOR_GOLD     = '#847e65'
  var FONT_GROTESK   = "'Space Grotesk', sans-serif"
  var WEIGHT_GROTESK = '300'
  var SIZE_GROTESK   = '18px'  // Space Grotesk x-height is larger than serif; scale down to match

  function rndCh() { return ALPHA[Math.floor(Math.random() * ALPHA.length)] }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }

  // ─── Core scramble: replace el's content with targetText, lock chars L→R ─────
  // opts: { color, finalColor, burstMs }
  function scrambleTo(el, targetText, duration, opts) {
    opts      = opts      || {}
    var color      = opts.color      || COLOR_GRAY
    var finalColor = opts.finalColor || color
    var burstMs    = opts.burstMs    != null ? opts.burstMs : 80

    return new Promise(function (resolve) {
      var n     = targetText.length
      var items = []

      el.innerHTML = ''
      for (var i = 0; i < n; i++) {
        var ch      = targetText[i]
        var isAlpha = /[a-zA-Z]/.test(ch)
        var pct     = n > 1 ? i / (n - 1) : 0
        // left-to-right bias with randomness
        var lockT   = burstMs + pct * (duration - burstMs) * 0.72
                      + Math.random() * (duration - burstMs) * 0.28
        lockT = Math.max(burstMs + 30, Math.min(duration, lockT))

        var span = document.createElement('span')
        span.textContent = isAlpha ? rndCh() : ch
        span.style.color = color
        el.appendChild(span)
        items.push({ el: span, ch: ch, isAlpha: isAlpha, t: lockT, done: false })
      }

      var start    = performance.now()
      var lastSwap = start

      ;(function frame(now) {
        var elapsed = now - start
        var doSwap  = (now - lastSwap) >= SWAP_MS
        if (doSwap) lastSwap = now

        var pending = 0
        for (var j = 0; j < items.length; j++) {
          var s = items[j]
          if (s.done) continue
          if (elapsed >= s.t) {
            s.el.textContent = s.ch
            s.el.style.color = finalColor
            s.done = true
          } else {
            if (doSwap && s.isAlpha) s.el.textContent = rndCh()
            pending++
          }
        }

        if (pending > 0) requestAnimationFrame(frame)
        else resolve()
      })(performance.now())
    })
  }

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  async function runHero() {
    var h1 = document.querySelector('.hero-name')
    if (!h1) return

    var originalHTML = h1.innerHTML

    // Lock line-height before switching fonts to prevent layout jumps
    var lockedLH = window.getComputedStyle(h1).lineHeight
    h1.style.lineHeight  = lockedLH
    h1.style.fontFamily  = FONT_GROTESK
    h1.style.fontWeight  = WEIGHT_GROTESK

    // Phase 1 — noise → "Product Designer", hold 2s
    await scrambleTo(h1, 'Product Designer', 700, {
      color: COLOR_GRAY, finalColor: COLOR_GRAY, burstMs: 0,
    })
    await wait(2000)

    // Phase 2 — rebuild h1 with two word spans, scramble only "Product" → "AI"
    var w1 = document.createElement('span')
    var w2 = document.createElement('span')
    w1.textContent = 'Product'; w1.style.color = COLOR_GRAY
    w2.textContent = 'Designer'; w2.style.color = COLOR_GRAY
    h1.innerHTML = ''
    h1.appendChild(w1)
    h1.appendChild(document.createTextNode(' '))
    h1.appendChild(w2)

    // Only w1 scrambles; w2 stays visible and unchanged
    await scrambleTo(w1, 'Lead', 480, {
      color: COLOR_GRAY, finalColor: COLOR_GRAY, burstMs: 60,
    })
    await wait(2000)

    // Phase 3 — restore original font, scramble full h1 to final text, gray → gold
    h1.style.fontFamily = ''
    h1.style.fontWeight = ''
    await scrambleTo(h1, "I'm Leo Gomez Blum", 900, {
      color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 100,
    })

    // Snap to exact original markup; CSS takes over colour
    h1.innerHTML = originalHTML
    h1.style.lineHeight = ''

    await wait(300)
    runTabs()
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  async function runTabs() {
    var tabs = document.querySelectorAll('.work-tab')
    if (!tabs.length) { initCards(); return }

    // Store original HTML for restoration
    var origHTMLs = Array.prototype.map.call(tabs, function (t) { return t.innerHTML })

    // Reveal each tab one at a time with two-phase scramble if data-scramble-from is set
    for (var i = 0; i < tabs.length; i++) {
      var tab       = tabs[i]
      var text      = tab.textContent.trim()
      var fromLabel = tab.getAttribute('data-scramble-from') || null

      // Lock line-height before font switch (white-space:nowrap handles wrapping)
      tab.style.lineHeight = window.getComputedStyle(tab).lineHeight
      tab.style.fontFamily = FONT_GROTESK
      tab.style.fontWeight = WEIGHT_GROTESK
      tab.style.fontSize   = SIZE_GROTESK
      tab.style.transform  = 'translateY(-2px)'

      if (fromLabel) {
        // Phase A: noise → intermediate label, hold 2s
        await scrambleTo(tab, fromLabel, 500, {
          color: COLOR_GRAY, finalColor: COLOR_GRAY, burstMs: 0,
        })
        await wait(2000)
        // Phase B: intermediate → real name, gray → gold
        await scrambleTo(tab, text, 500, {
          color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 0,
        })
      } else {
        await scrambleTo(tab, text, 500, {
          color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 0,
        })
      }

      // Restore the original HTML (em tags etc.) then drop inline styles
      tab.innerHTML    = origHTMLs[i]
      tab.style.fontFamily = ''
      tab.style.fontWeight = ''
      tab.style.fontSize   = ''
      tab.style.lineHeight = ''
      tab.style.transform  = ''
      await wait(100)
    }

    // Hover: enter shows intermediate label, leave restores full text
    tabs.forEach(function (tab, idx) {
      var origHTML  = origHTMLs[idx]
      var fullText  = tab.textContent.trim()
      var fromLabel = tab.getAttribute('data-scramble-from') || null
      var animating = false
      var pendingOut = false

      function lockTab() {
        tab.style.lineHeight = window.getComputedStyle(tab).lineHeight
        tab.style.fontFamily = FONT_GROTESK
        tab.style.fontWeight = WEIGHT_GROTESK
        tab.style.fontSize   = SIZE_GROTESK
        tab.style.transform  = 'translateY(-2px)'
      }

      function unlockTab() {
        tab.innerHTML    = origHTML
        tab.style.fontFamily = ''
        tab.style.fontWeight = ''
        tab.style.fontSize   = ''
        tab.style.lineHeight = ''
        tab.style.transform  = ''
      }

      tab.addEventListener('mouseenter', function () {
        if (!fromLabel) return
        pendingOut = false
        if (animating) return
        animating = true
        lockTab()
        scrambleTo(tab, fromLabel, 400, {
          color: COLOR_GRAY, finalColor: COLOR_GRAY, burstMs: 0,
        }).then(function () {
          animating = false
          if (pendingOut) runOut()
        })
      })

      tab.addEventListener('mouseleave', function () {
        if (!fromLabel) return
        pendingOut = true
        if (animating) return
        runOut()
      })

      function runOut() {
        animating = true
        pendingOut = false
        scrambleTo(tab, fullText, 400, {
          color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 0,
        }).then(function () {
          unlockTab()
          animating = false
        })
      }
    })

    // Start card animations only after the full intro sequence
    initCards()
  }

  // ─── Cards ────────────────────────────────────────────────────────────────────
  function initCards() {
    var cards = document.querySelectorAll('company-card')
    cards.forEach(function (card) {
      var nameEl = card.querySelector('.company-name')
      if (!nameEl) return

      var realName  = nameEl.textContent.trim()
      var fromLabel = card.getAttribute('data-scramble-from') || null
      var fired     = false

      var obs = new IntersectionObserver(function (entries) {
        if (fired || !entries[0].isIntersecting) return
        fired = true
        obs.disconnect()
        animateCard(nameEl, realName, fromLabel, card)
      }, { threshold: 0.85 })

      obs.observe(card)
    })
  }

  async function animateCard(nameEl, realName, fromLabel, card) {
    // Lock width, height, and line-height before font switch to pin the baseline
    nameEl.style.width      = nameEl.offsetWidth + 'px'
    nameEl.style.height     = nameEl.offsetHeight + 'px'
    nameEl.style.lineHeight = window.getComputedStyle(nameEl).lineHeight
    nameEl.style.fontFamily = FONT_GROTESK
    nameEl.style.fontWeight = WEIGHT_GROTESK

    if (fromLabel) {
      // Phase A: noise → descriptor label
      await scrambleTo(nameEl, fromLabel, 640, {
        color: COLOR_GRAY, finalColor: COLOR_GRAY, burstMs: 0,
      })
      await wait(240)
      // Phase B: descriptor → real name, gray → gold
      await scrambleTo(nameEl, realName, 640, {
        color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 80,
      })
    } else {
      await scrambleTo(nameEl, realName, 760, {
        color: COLOR_GRAY, finalColor: COLOR_GOLD, burstMs: 0,
      })
    }

    // Restore clean text + let CSS control the colour
    nameEl.textContent      = realName
    nameEl.style.fontFamily = ''
    nameEl.style.fontWeight = ''
    nameEl.style.lineHeight = ''
    nameEl.style.height     = ''
    nameEl.style.width      = ''
    nameEl.style.color      = ''

    // Fade in the thumbnail and start the lottie (if any) after the title settles
    if (card) {
      var thumb = card.querySelector('.company-thumb')
      if (thumb) thumb.style.opacity = '1'
      var lottie = card.querySelector('dotlottie-player')
      if (lottie) lottie.play()
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  function init() {
    // For cards with a lottie thumbnail: hide the thumb and stop the player at boot
    // so they only appear after the card's title animation finishes
    document.querySelectorAll('company-card').forEach(function (card) {
      var lottie = card.querySelector('dotlottie-player')
      if (!lottie) return
      var thumb = card.querySelector('.company-thumb')
      if (thumb) {
        thumb.style.opacity   = '0'
        thumb.style.transition = 'opacity 0.7s ease'
      }
      if (typeof lottie.stop === 'function') {
        lottie.stop()
      } else {
        lottie.addEventListener('ready', function () { lottie.stop() }, { once: true })
      }
    })
    runHero()
    // initCards is called by runTabs() after the full intro sequence
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
