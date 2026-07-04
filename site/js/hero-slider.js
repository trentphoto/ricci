/*
 * Ricci's homepage hero slider — auto-only, no controls.
 * First slide holds for 6s, then each slide advances every 10s.
 * Transition is a soft fade + horizontal drift (see .hero-slide in styles.css),
 * with the outgoing slide getting .is-leaving so it drifts left as it fades.
 * Respects prefers-reduced-motion by not auto-advancing.
 */
(function () {
  var slider = document.getElementById('home-hero');
  if (!slider) return;

  var slides = [].slice.call(slider.querySelectorAll('.hero-slide'));
  if (slides.length < 2) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // leave the first slide showing, no motion

  var idx = 0;
  var CLEANUP_MS = 1000; // matches the transform transition in CSS

  function advance() {
    var prev = idx;
    idx = (idx + 1) % slides.length;
    if (prev === idx) return;

    var leaving = slides[prev];
    slides[prev].classList.remove('is-active');
    slides[prev].classList.add('is-leaving');
    slides[idx].classList.add('is-active');

    // Once the drift-out finishes, drop .is-leaving so the slide resets to its
    // resting position off-right (while invisible) for its next turn.
    window.setTimeout(function () { leaving.classList.remove('is-leaving'); }, CLEANUP_MS);
  }

  // Hold the first slide 6s, then cycle every 10s.
  window.setTimeout(function () {
    advance();
    window.setInterval(advance, 10000);
  }, 6000);
})();
