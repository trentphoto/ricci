/*
 * Rolling Gameday cutoff. Shipping runs Monday through Wednesday; this
 * computes the next Wednesday noon cutoff instead of expiring on a campaign
 * date. It states the Sunday-game consequence directly, so the deadline
 * reads as a decision rather than a shipping detail.
 */
(function () {
  "use strict";

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function nextCutoff(now) {
    var cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    var daysUntilWednesday = (3 - now.getDay() + 7) % 7;
    cutoff.setDate(cutoff.getDate() + daysUntilWednesday);
    if (now.getDay() === 3 && now.getTime() >= cutoff.getTime()) cutoff.setDate(cutoff.getDate() + 7);
    return cutoff;
  }

  function arrivalDate(cutoff) {
    var arrival = new Date(cutoff.getTime());
    arrival.setDate(arrival.getDate() + 2);
    return arrival;
  }

  function formatDate(date) {
    return DAYS[date.getDay()] + ", " + MONTHS[date.getMonth()].slice(0, 3) + " " + date.getDate();
  }

  function daysLeft(now, cutoff) {
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var cutoffDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
    return Math.round((cutoffDay.getTime() - today.getTime()) / 86400000);
  }

  function render() {
    var el = document.getElementById("gameday-cutoff");
    if (!el) return;
    var now = new Date();
    var cutoff = nextCutoff(now);
    var arrival = arrivalDate(cutoff);
    var remaining = daysLeft(now, cutoff);
    var countdown = remaining === 1 ? "1 day left" : remaining + " days left";
    if (remaining === 0) countdown = "Final day to order";
    el.innerHTML = "<span class=\"pdp-delivery-countdown\">&#9201; <strong>" +
      countdown + "</strong> to order for Sunday.</span>" +
      "<span>Order by Wednesday at noon and it\u2019s at your door by <strong>" +
      formatDate(arrival) + "</strong> &mdash; two days before kickoff. Miss it and " +
      "the next box ships Monday.</span>";
  }

  function init() {
    render();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
