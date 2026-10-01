/* Table hero gallery. Arrow navigation is scoped to gallery focus. */
(function () {
  "use strict";
  document.querySelectorAll("[data-pack-gallery]").forEach(function (gallery) {
    var main = gallery.querySelector("[data-gallery-main]");
    var caption = gallery.querySelector("[data-gallery-caption]");
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll("[data-gallery-thumb]"));
    if (!main || !caption || !thumbs.length) return;
    var selected = Math.max(0, thumbs.findIndex(function (thumb) {
      return thumb.getAttribute("aria-pressed") === "true";
    }));
    function select(index) {
      var button = thumbs[index];
      var photo = button.querySelector("img");
      if (!photo) return;
      selected = index;
      main.src = photo.getAttribute("src");
      main.alt = photo.alt;
      main.width = photo.width;
      main.height = photo.height;
      main.style.objectFit = button.getAttribute("data-fit") || "contain";
      caption.textContent = button.getAttribute("data-caption");
      thumbs.forEach(function (thumb) {
        thumb.setAttribute("aria-pressed", String(thumb === button));
      });
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
