/*!
 * CPK Hagen — Animated Number Counters
 * Vanilla JS, no dependencies. Triggers once per element on scroll entry.
 *
 * Handles:
 *   "3.000<sup>+</sup>"   → counts 0 → 3000, formats as "3.000"
 *   "98<em>%</em>"        → counts 0 → 98
 *   "Seit<em> 1998</em>"  → year roll: counts from ~1970 → 1998 (inside <em>)
 *   Plain "12"            → counts 0 → 12
 *   "GKV<em> & PKV</em>"  → skipped (no animatable number)
 *   Values < 10           → skipped (single-step animation looks wrong)
 */
(function () {
  'use strict';

  if (!window.IntersectionObserver || !window.requestAnimationFrame) return;

  function easeOutExtreme(t) {
    return 1 - Math.pow(1 - t, 10);
  }

  /* ── Format integer with German thousands dot when original had one ── */
  function fmtNum(n, useDot) {
    var s = String(n);
    return (useDot && n >= 1000)
      ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : s;
  }

  /*
   * parse(el) — inspects a .stat-num or .sbar-num element and returns
   * an animation config object, or null if no animatable number is found.
   *
   * Config: { node, target, pre, suf, dot }
   *   node   — the DOM node whose textContent we update (text node or sub-element)
   *   target — integer to count up to
   *   pre    — literal string prepended before the number (e.g. " ")
   *   suf    — literal string appended after the number  (e.g. "")
   *   dot    — true if original used German dot thousands separator
   */
  function parse(el) {
    var sub = el.querySelector('sup, em');

    /* Build a string from all direct text nodes (ignoring sub-element text) */
    var topRaw = '';
    var nodes = el.childNodes;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 3) topRaw += nodes[i].textContent;
    }
    topRaw = topRaw.trim();

    /* ── Case A: number lives in the top-level text node ── */
    /* Matches strings like "3.000", "98", "12", "1" */
    var m = topRaw.match(/^(\D*)([\d.]+)(\D*)$/);
    if (m) {
      var val = parseInt(m[2].replace(/\./g, ''), 10);
      if (isNaN(val) || val < 10) return null; /* skip tiny numbers */

      /* Find the specific text node containing the digit */
      var tNode = null;
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j].nodeType === 3 && /\d/.test(nodes[j].textContent)) {
          tNode = nodes[j];
          break;
        }
      }
      if (!tNode) return null;

      return {
        node: tNode,
        target: val,
        pre:  m[1],
        suf:  m[3],
        dot:  m[2].indexOf('.') !== -1
      };
    }

    /* ── Case B: number lives inside the sub-element ── */
    /* Handles "Seit<em> 1998</em>" — "Seit" has no digits, but <em> has "1998" */
    if (sub) {
      var sm = sub.textContent.match(/^(\D*)([\d.]+)(\D*)$/);
      if (sm) {
        var val2 = parseInt(sm[2].replace(/\./g, ''), 10);
        if (isNaN(val2) || val2 < 10) return null;
        return {
          node: sub,          /* update the sub-element's textContent directly */
          target: val2,
          pre:  sm[1],        /* e.g. " " before the year */
          suf:  sm[3],        /* e.g. "" after the year */
          dot:  sm[2].indexOf('.') !== -1
        };
      }
    }

    return null; /* "GKV & PKV" and other non-numeric cases */
  }

  /* ── Animate one counter ── */
  function run(cfg, startDelay) {
    /*
     * Calendar years: start close to the target so we don't count from year 0.
     * Everything else: start from 0.
     */
    var from = (cfg.target >= 1900 && cfg.target <= 2100)
      ? cfg.target - 28
      : 0;

    /* Slightly longer for large numbers — feels proportional */
    var dur = 4800;

    function go() {
      var t0 = null;

      function step(ts) {
        if (!t0) t0 = ts;
        var p   = Math.min((ts - t0) / dur, 1);
        var cur = Math.round(from + (cfg.target - from) * easeOutExtreme(p));
        cfg.node.textContent = cfg.pre + fmtNum(cur, cfg.dot) + cfg.suf;

        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          /* Lock to exact final value — no floating-point surprises */
          cfg.node.textContent = cfg.pre + fmtNum(cfg.target, cfg.dot) + cfg.suf;
        }
      }

      requestAnimationFrame(step);
    }

    startDelay > 0 ? setTimeout(go, startDelay) : go();
  }

  /* ── Bootstrap ── */
  function init() {
    var items = document.querySelectorAll('.stat-num, .sbar-num');
    if (!items.length) return;

    /* Build element → config map, skipping non-animatable elements */
    var map = new Map();
    items.forEach(function (el) {
      var cfg = parse(el);
      if (cfg) map.set(el, cfg);
    });
    if (!map.size) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var cfg = map.get(entry.target);
        if (cfg) {
          /*
           * Read any CSS transition-delay from the element (e.g. .d2 = 0.12s).
           * This syncs the counter start with the scroll-reveal fade-in stagger.
           */
          var delay = 0;
          try {
            var td = window.getComputedStyle(entry.target).transitionDelay;
            /* transitionDelay may be "0.12s, 0.12s" for multiple properties */
            delay = Math.round(parseFloat(td) * 1000) || 0;
          } catch (e) {}

          run(cfg, delay);
        }

        io.unobserve(entry.target); /* fire exactly once */
      });
    }, {
      threshold: 0.25  /* element must be 25% visible before triggering */
    });

    map.forEach(function (_, el) { io.observe(el); });
  }

  /* Works whether script is deferred or inline */
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
