/* Centered unmute overlay; normal player controls after the first click.
 * At most one video plays. Native files may use data-video-src. */
(function () {
  "use strict";
  var boxes = Array.prototype.filter.call(document.querySelectorAll(".pack-video-media[data-youtube-id]"), function (el) {
    return el.getAttribute("data-video-src") || /^[A-Za-z0-9_-]{11}$/.test(el.getAttribute("data-youtube-id") || "");
  });
  if (!boxes.length || !("IntersectionObserver" in window)) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var api, items = [], active = null;
  function loadApi() {
    if (api) return api;
    api = new Promise(function (resolve) {
      if (window.YT && window.YT.Player) return resolve();
      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        try { if (previous) previous(); } finally { resolve(); }
      };
      var script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
    return api;
  }
  function label(item) {
    item.button.textContent = "Click to unmute";
    item.button.setAttribute("aria-label", "Click to unmute: " + item.el.getAttribute("data-video-title"));
    item.button.hidden = !!item.engaged;
  }
  function silence(item) {
    item.sound = false;
    if (item.ready) item.player.mute();
    label(item);
  }
  function pause(item) {
    if (!item.ready) return;
    item.player.pauseVideo();
    item.playing = false;
    silence(item);
  }
  function start(item) {
    items.forEach(function (other) { if (other !== item) pause(other); });
    active = item;
    item.player.playVideo();
    item.playing = true;
    label(item);
  }
  function sync() {
    if (document.visibilityState !== "visible") {
      items.forEach(pause);
      active = null;
      return;
    }
    if (active && active.visible && !active.pausedByUser) return;
    if (active) pause(active);
    active = null;
    // Only the first section auto-starts. The second is explicitly played.
    var first = items[0];
    if (first && first.ready && first.visible && !first.pausedByUser && !first.engaged && !reduced) start(first);
  }
  function nativePlayer(item) {
    var video = document.createElement("video");
    video.src = item.el.getAttribute("data-video-src");
    video.preload = "none";
    video.muted = true;
    video.playsInline = true;
    video.controls = false;
    item.nativeVideo = video;
    var poster = item.el.querySelector("img");
    if (poster) video.poster = poster.getAttribute("src");
    video.setAttribute("aria-label", item.el.getAttribute("data-video-title"));
    item.el.appendChild(video);
    item.player = {
      mute: function () { video.muted = true; },
      unMute: function () { video.muted = false; },
      setVolume: function (volume) { video.volume = volume / 100; },
      pauseVideo: function () { video.pause(); },
      playVideo: function () {
        video.play().catch(function () { item.blocked = true; item.playing = false; label(item); });
      }
    };
    video.addEventListener("playing", function () { item.el.classList.add("is-playing"); });
    video.addEventListener("ended", function () { item.pausedByUser = true; pause(item); });
    video.addEventListener("error", function () { item.el.classList.remove("is-ready", "is-playing"); item.button.remove(); });
    item.ready = true;
    item.el.classList.add("is-ready");
    item.el.appendChild(item.button);
    sync();
  }
  function build(item) {
    if (item.built) return;
    item.built = true;
    if (item.el.getAttribute("data-video-src")) { nativePlayer(item); return; }
    loadApi().then(function () {
      var id = item.el.getAttribute("data-youtube-id");
      var slot = document.createElement("div");
      item.el.appendChild(slot);
      item.player = new window.YT.Player(slot, {
        host: "https://www.youtube-nocookie.com", videoId: id,
        playerVars: { mute: 1, controls: 1, playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady: function (event) {
            item.player = event.target;
            item.player.mute();
            item.ready = true;
            var iframe = item.player.getIframe();
            iframe.setAttribute("title", item.el.getAttribute("data-video-title"));
            item.el.classList.add("is-ready");
            item.el.appendChild(item.button);
            sync(item);
          },
          onStateChange: function (event) {
            if (event.data === 1) {
              items.forEach(function (other) { if (other !== item) pause(other); });
              active = item; item.playing = true; item.el.classList.add("is-playing");
            }
            if (event.data === 0 || event.data === 2) item.playing = false;
            if (event.data === 0) item.pausedByUser = true;
            label(item);
          },
          onAutoplayBlocked: function () { item.blocked = true; label(item); },
          onError: function () {
            item.el.classList.remove("is-ready", "is-playing");
            item.button.remove();
          }
        }
      });
    });
  }
  boxes.forEach(function (el) {
    var item = { el: el, visible: false, sound: false, ready: false, started: false };
    item.button = document.createElement("button");
    item.button.type = "button";
    item.button.className = "pack-video-sound";
    label(item);
    item.button.addEventListener("click", function () {
      if (!item.ready) return;
      if (item.engaged) return;
      items.forEach(function (other) {
        if (other === item || !other.ready) return;
        silence(other);
        other.player.pauseVideo();
      });
      item.started = true;
      item.engaged = true;
      if (item.nativeVideo) item.nativeVideo.controls = true;
      item.pausedByUser = false;
      item.sound = true;
      item.player.unMute();
      item.player.setVolume(100);
      start(item);
      label(item);
    });
    items.push(item);
  });
  var near = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      near.unobserve(entry.target);
      build(items[boxes.indexOf(entry.target)]);
    });
  }, { rootMargin: "400px 0px" });
  var onScreen = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var item = items[boxes.indexOf(entry.target)];
      item.visible = entry.intersectionRatio >= 0.5;
    });
    sync();
  }, { threshold: [0, 0.5] });
  document.addEventListener("visibilitychange", sync);
  boxes.forEach(function (el) { near.observe(el); onScreen.observe(el); });
})();
