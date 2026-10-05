/* Hero gallery with a video first slot. Thumbs swap the stage between the
 * video (.pack-video-media, driven by pack-videos.js) and photos. Hiding the
 * video makes pack-videos.js's IntersectionObserver pause it. */
(function () {
  "use strict";
  document.querySelectorAll("[data-media-gallery]").forEach(function (gallery) {
    var video = gallery.querySelector("[data-media-video]");
    var photo = gallery.querySelector("[data-media-photo]");
    var caption = gallery.querySelector("[data-media-caption]");
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll("[data-media-thumb]"));
    if (!photo || !caption || !thumbs.length) return;
    var selected = 0;
    function select(index) {
      var button = thumbs[index];
      selected = index;
      var isVideo = button.getAttribute("data-kind") === "video";
      if (video) video.hidden = !isVideo;
      photo.hidden = isVideo;
      if (!isVideo) {
        var img = button.querySelector("img");
        photo.src = img.getAttribute("src");
        photo.alt = img.alt;
        photo.style.objectFit = button.getAttribute("data-fit") || "cover";
      }
      caption.textContent = button.getAttribute("data-caption");
      thumbs.forEach(function (t) { t.setAttribute("aria-pressed", String(t === button)); });
    }
    thumbs.forEach(function (button, index) {
      button.addEventListener("click", function () { select(index); });
    });
    gallery.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var next = (selected + (event.key === "ArrowRight" ? 1 : -1) + thumbs.length) % thumbs.length;
      select(next);
      thumbs[next].focus();
    });
  });
})();
