(function () {
  var toggle = document.getElementById('site-nav-toggle');
  var nav = document.getElementById('primary-nav');
  var backdrop = document.getElementById('nav-backdrop');
  if (!nav) return;

  // Highlight the link for the page we're actually on.
  (function markCurrent() {
    function normalize(path) {
      if (path === '' || path.charAt(path.length - 1) === '/') path += 'index.html';
      return path;
    }
    var current = normalize(window.location.pathname);
    nav.querySelectorAll('a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (normalize(link.pathname) === current) {
        link.setAttribute('aria-current', 'page');
      }
    });
  })();

  if (!toggle) return;

  var mq = window.matchMedia('(max-width: 900px)');

  function isMobile() {
    return mq.matches;
  }

  function syncNavAria() {
    if (!isMobile()) {
      nav.removeAttribute('aria-hidden');
      return;
    }
    if (document.body.classList.contains('nav-drawer-open')) {
      nav.removeAttribute('aria-hidden');
    } else {
      nav.setAttribute('aria-hidden', 'true');
    }
  }

  function open() {
    document.body.classList.add('nav-drawer-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    if (backdrop) backdrop.setAttribute('aria-hidden', 'false');
    syncNavAria();
  }

  function close() {
    document.body.classList.remove('nav-drawer-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
    syncNavAria();
  }

  function onToggleClick() {
    if (!isMobile()) return;
    if (document.body.classList.contains('nav-drawer-open')) close();
    else open();
  }

  toggle.addEventListener('click', onToggleClick);

  if (backdrop) {
    backdrop.addEventListener('click', close);
  }

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMobile()) close();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  mq.addEventListener('change', function () {
    close();
  });

  syncNavAria();
})();

/* ── Tricolore nav accent — click for a wink to the Italians ── */
(function () {
  if (document.querySelector('.tricolore')) return;

  var phrases = [
    'Break the spaghetti and Nonna breaks you. 🤌',
    'Snapping sausage into little coins? Nonna wept.',
    'Pineapple on pizza is a war crime. 🍍🚫',
    'It’s sauce. It’s gravy. Don’t start a family feud.',
    'Chicken does not go in the pasta. It just doesn’t.',
    'Al dente or nothing, amico.',
    'Alfredo “sauce” isn’t Italian. Sorry, not sorry.',
    'Use your hands, not a garlic press — Nonna insists.',
    'That much oregano? Perfetto. Keep going.',
    'Meatballs on the spaghetti? Bellissimo chaos.'
  ];

  var btn = document.createElement('button');
  btn.className = 'tricolore';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'A little Italian wisdom');
  btn.innerHTML = '<i class="t-green"></i><i class="t-red"></i>';

  var bubble = document.createElement('div');
  bubble.className = 'tricolore-bubble';
  bubble.setAttribute('role', 'status');

  var last = -1;
  var hideTimer;

  function say() {
    var i = Math.floor(Math.random() * phrases.length);
    if (i === last) i = (i + 1) % phrases.length;
    last = i;
    bubble.textContent = phrases[i];
    bubble.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 3400);
  }

  function hide() {
    bubble.classList.remove('show');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    say();
  });
  document.addEventListener('click', hide);

  document.body.appendChild(btn);
  document.body.appendChild(bubble);
})();
