# Pittsburgh Italian Pack — period v2 and design review

A–C remain live with equal probability (one third each): control, FREE meatball
wording, and control wording with Hot/Sweet grill pan hero photos. Campaign URL:
`/shop/pittsburgh-italian-pack`. Existing cookie `ricci_italian_pack_v2`, endpoint
`/api/experiments/italian-pack-v2/events`, and accumulated results remain intact.

Three new designs are registered as D–F in the same CRM test, staged as drafts:

| Version | Review path | Design |
| --- | --- | --- |
| D | `/shop/pittsburgh-italian-pack-minimal.html?preview=1` | White, concise copy, clear manifest, direct purchase |
| E | `/shop/pittsburgh-italian-pack-butcher.html?preview=1` | Large food photograph, freezer benefits, order card, process steps |
| F | `/shop/pittsburgh-italian-pack-table.html?preview=1` | Warm cream, family story, Sunday dinner framing |

Drafts receive zero traffic and never emit experiment events, even when loaded
on production without `?preview=1`. The CRM rejects draft events and shows
preview links on their rows. Preview visits are excluded on every version.
The production preview links work after these site files have been published.

All six pages now share two “How it’s made” sections after the box contents /
before the guarantee. Both videos use the same wide column in a 1320px
section, with a product photo and quantity beside each (meatball bag and Lil’s
sausage roll). On mobile, the video fills the section above the copy and photo:
- Meatballs: `https://www.youtube.com/watch?v=uvGXhziw7zI`
- Lil’s sausage rolls: `https://www.youtube.com/watch?v=rTCpX1q99A8`

Videos load near the viewport. Only the meatball section autoplays muted; the
roll section starts when its unmute overlay is clicked. At most one video plays. Both pause and mute
offscreen or in a hidden tab. A centered “Click to unmute” overlay disappears
on the first click, enabling sound and revealing regular YouTube controls.
No separate custom play or mute buttons remain. Native files reveal their
standard browser controls on the same click. Set `data-video-src` on each
media container to an actual MP4 URL to use the native HTML5 player; no video
files are available yet, so current previews still use YouTube. Reduced-motion visitors opt into playback.
The same overlay starts playback when autoplay is blocked or reduced motion is enabled. Poster and direct YouTube
links remain usable if the player cannot load. YouTube embedding and real
browser autoplay must be checked during visual review.

Every price and checkout uses the existing state-based pricing: $189 base,
shipping included, up to $221 for Zone E. The drafts retain the state picker,
shared `shipping.js`, and `[data-buy-now]` Italian Pack checkout routing.
The fixed bundle is 5 lb sweet, 5 lb hot, 2 lb meatballs and one sausage roll;
no product changes, invented reviews, limited-time offers or scarcity claims.

## Review and deployment

Prepared locally; no deployment or traffic activation has been performed.
Serve `site/` locally and use the paths above. Deploy CRM first, then the site.
The video addition updates A–C as well, so annotate its deployment date when
interpreting the existing period’s results; pre-video counts are retained.

After design approval, coordinate activation in the website `variants` array
and CRM `draftVariants`. Prefer a fresh reporting period for a clean six-way
comparison, preserving v2 in previous results. Merely adding three variants to
the current array does not reassign returning A–C browsers. Draft registration
is code-based; no admin enable/disable controls or automatic period creation.

Validation: `node --test tools/italian-pack/behavior.test.mjs`,
`node tools/check-pages.mjs` with all six HTML paths, and
`bun test src/experiments.test.ts` in `../riccis-crm`.
Views/Buy clicks are deduplicated; they are not paid orders or revenue.


The table review’s final process sections are now shared across A–F. Each has a
large product title and its own subheading; Meatballs uses `#EAE0CB`, Sausage
Rolls uses warm white. Both show the product photo and quantity, and the rolls
section includes the owner-supplied historical photo converted to WebP on
A–E. The table variant shows that photo in its hero gallery instead.
Only these two sections were copied to the other variants; their surrounding
page layouts, offers, checkout and experiment assignments are unchanged.

The three new designs initialize Meta Pixel before the shared ecommerce event
script. The table hero gallery includes keyboard navigation using Left/Right
Arrow keys while focused.
