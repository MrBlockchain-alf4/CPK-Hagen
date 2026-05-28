/*!
 * CPK Hagen — Clinic Opening Hours Status
 * Vanilla JS, no dependencies. Populates #clinicStatus on DOMContentLoaded,
 * then refreshes every 30 seconds without a page reload.
 *
 * Schedule: Monday–Friday 08:00–17:00 · Saturday–Sunday closed
 *
 * Output labels (German):
 *   OPEN:   "Heute geöffnet bis 17:00 Uhr"
 *   CLOSED: "Heute geschlossen · Öffnet heute um 08:00 Uhr"   ← before opening
 *           "Heute geschlossen · Öffnet morgen um 08:00 Uhr"  ← tomorrow
 *           "Heute geschlossen · Öffnet Montag um 08:00 Uhr"  ← further ahead
 */
(function () {
  'use strict';

  /* ── Opening hours ─────────────────────────────────────────────
     Keys: JS day index (0 = Sunday … 6 = Saturday)
     Values: { open: hour, close: hour }  (24-hour, whole hours only)
  ─────────────────────────────────────────────────────────────── */
  var SCHEDULE = {
    1: { open: 8, close: 17 },   /* Monday    */
    2: { open: 8, close: 17 },   /* Tuesday   */
    3: { open: 8, close: 17 },   /* Wednesday */
    4: { open: 8, close: 17 },   /* Thursday  */
    5: { open: 8, close: 17 },   /* Friday    */
    /* 0 (Sunday) and 6 (Saturday) absent → closed */
  };

  var DAY_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  /* Zero-pad a single-digit hour: 8 → "08" */
  function pad(h) { return h < 10 ? '0' + h : String(h); }

  /* Format an hour as "HH:00 Uhr" */
  function fmt(h) { return pad(h) + ':00 Uhr'; }

  /*
   * nextOpenLabel(fromDay, afterMins)
   * Returns the "Öffnet X um HH:00 Uhr" half of the closed label.
   *   fromDay   — JS day index the clock is currently on (0–6)
   *   afterMins — minutes already elapsed today (used to test same-day opens)
   */
  function nextOpenLabel(fromDay, afterMins) {
    var slot = SCHEDULE[fromDay];

    /* Clinic opens later today (only possible on a weekday before opening) */
    if (slot && afterMins < slot.open * 60) {
      return 'Öffnet heute um ' + fmt(slot.open);
    }

    /* Search the following days */
    for (var i = 1; i <= 7; i++) {
      var next     = (fromDay + i) % 7;
      var nextSlot = SCHEDULE[next];
      if (nextSlot) {
        var when = (i === 1) ? 'morgen' : DAY_DE[next];
        return 'Öffnet ' + when + ' um ' + fmt(nextSlot.open);
      }
    }

    return ''; /* unreachable */
  }

  /*
   * getStatus(date) → { state: 'open' | 'closed', label: string }
   *
   * OPEN:   "Heute geöffnet bis 17:00 Uhr"
   * CLOSED: "Heute geschlossen · Öffnet [next] um [time]"
   */
  function getStatus(date) {
    var day  = date.getDay();
    var mins = date.getHours() * 60 + date.getMinutes();
    var slot = SCHEDULE[day];

    /* Currently open */
    if (slot) {
      var openAt  = slot.open  * 60;
      var closeAt = slot.close * 60;
      if (mins >= openAt && mins < closeAt) {
        return { state: 'open', label: 'Heute geöffnet bis ' + fmt(slot.close) };
      }
    }

    /* Closed — build the combined label */
    var next = nextOpenLabel(day, mins);
    var label = next ? 'Heute geschlossen · ' + next : 'Heute geschlossen';
    return { state: 'closed', label: label };
  }

  /* ── DOM rendering ─────────────────────────────────────────── */
  function render(el, status) {
    var dotClass = status.state === 'open' ? 'is-open' : 'is-closed';

    var dot  = el.querySelector('.clinic-status-dot');
    var text = el.querySelector('.clinic-status-text');

    if (dot && text) {
      /* Subsequent update — change only what differs, preserving transitions */
      if (dot.className !== 'clinic-status-dot ' + dotClass) {
        dot.className = 'clinic-status-dot ' + dotClass;
      }
      if (text.textContent !== status.label) {
        text.textContent = status.label;
      }
    } else {
      /* First render — build structure */
      el.innerHTML =
        '<span class="clinic-status-dot ' + dotClass + '"></span>' +
        '<span class="clinic-status-text">'  + status.label + '</span>';
    }
  }

  /* ── Bootstrap ─────────────────────────────────────────────── */
  function init() {
    var el = document.getElementById('clinicStatus');
    if (!el) return;

    /* Populate immediately so content is ready before the CSS animation
       reveals the element at 1.38s (see hFadeUp delay on .clinic-status) */
    render(el, getStatus(new Date()));

    /* Refresh every 30 s — status changes are rare but should stay live */
    setInterval(function () {
      render(el, getStatus(new Date()));
    }, 30000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());
