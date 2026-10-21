/*
 * Review page (review.html). Prefills email/name from the post-purchase
 * email link (?email=…&name=…) and POSTs to the CRM's /api/reviews.
 * Reviews land as pending; they're approved in the CRM admin (/admin/reviews).
 */
(function () {
  "use strict";
  var form = document.getElementById("review-form");
  if (!form) return;
  var status = document.getElementById("review-status");
  var q = new URLSearchParams(location.search);
  if (q.get("email")) form.email.value = q.get("email");
  if (q.get("name")) form.name.value = q.get("name");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var rating = form.querySelector("input[name=rating]:checked");
    if (!rating) { status.textContent = "Please pick a star rating."; return; }
    if (!form.email.checkValidity()) { status.textContent = "Please enter a valid email."; return; }
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    status.textContent = "Sending…";
    fetch(window.CRM_BASE + "/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: Number(rating.value), body: form.body.value, name: form.name.value,
        email: form.email.value, _hp: form._hp.value
      })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || "Something went wrong.");
        form.hidden = true;
        document.getElementById("review-thanks").hidden = false;
      })
      .catch(function (err) {
        btn.disabled = false;
        status.textContent = err.message + " Please try again.";
      });
  });
})();
