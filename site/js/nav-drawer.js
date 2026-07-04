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
