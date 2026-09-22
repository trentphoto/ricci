/* Recurring weekly order window: Wednesday at noon Eastern for delivery Friday. */
(function () {
  'use strict';
  var panel = document.querySelector('[data-grill-deadline]');
  if (!panel) return;

  var copy = panel.querySelector('[data-deadline-copy]');
  var clock = panel.querySelector('[data-deadline-clock]');
  var repeat = document.querySelector('[data-deadline-repeat]');

  function easternParts(date) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    var out = {};
    parts.forEach(function (part) { if (part.type !== 'literal') out[part.type] = part.value; });
    return out;
  }

  function easternOffset(date) {
    var p = easternParts(date);
    var representedAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return representedAsUtc - date.getTime();
  }

  function easternTime(year, month, day, hour) {
    var guess = new Date(Date.UTC(year, month - 1, day, hour));
    return new Date(guess.getTime() - easternOffset(guess));
  }

  function nextWindow(now) {
    var p = easternParts(now);
    var weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var daysUntilWednesday = (3 - weekdays[p.weekday] + 7) % 7;
    var noonToday = easternTime(+p.year, +p.month, +p.day, 12);
    if (daysUntilWednesday === 0 && now.getTime() >= noonToday.getTime()) {
      daysUntilWednesday = 7;
    }
    var targetDate = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + daysUntilWednesday));
    var cutoff = easternTime(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, targetDate.getUTCDate(), 12);
    var deliveryDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate() + 2));
    var delivery = easternTime(deliveryDate.getUTCFullYear(), deliveryDate.getUTCMonth() + 1, deliveryDate.getUTCDate(), 18);
    return { cutoff: cutoff, delivery: delivery };
  }

  var dateFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric'
  });

  function render() {
    var now = new Date();
    var window = nextWindow(now);
    var remaining = window.cutoff.getTime() - now.getTime();
    var deliveryText = dateFormat.format(window.delivery);
    var message = 'Order by Wednesday at noon ET to get your Grill Box by ' + deliveryText + ', ready for the weekend.';
    panel.hidden = false;
    copy.textContent = message;
    var seconds = Math.floor(remaining / 1000);
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor(seconds % 86400 / 3600);
    var minutes = Math.floor(seconds % 3600 / 60);
    clock.textContent = days + 'd : ' + String(hours).padStart(2, '0') + 'h : ' + String(minutes).padStart(2, '0') + 'm';
    if (repeat) { repeat.hidden = false; repeat.textContent = 'Order by Wednesday at noon ET to get your Grill Box by ' + deliveryText + ', ready for the weekend.'; }
  }
  render();
  setInterval(render, 1000);
  document.addEventListener('visibilitychange', render);
})();
