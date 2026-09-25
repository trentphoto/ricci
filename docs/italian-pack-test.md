# Pittsburgh Italian Pack — period v2

Three enabled versions receive equal probability (one third each): control,
FREE meatball wording, and control wording with Hot/Sweet grill pan hero photos.
Campaign URL: `/shop/pittsburgh-italian-pack`. Preview any version with `?preview=1`.

CRM experiment and endpoint slug: `italian-pack-v2`. Cookie: `ricci_italian_pack_v2`.
The new cookie reassigns browsers for this period; assignments persist for 90 days.
Old meatball framing results remain separate. Views and Buy clicks are deduplicated;
these are not paid orders. Allocation is random, so observed counts will vary.

Deploy CRM first, then publish all three pages and the new italian-pack scripts
in the same site deployment. This change is prepared locally, not yet deployed.

For another version: create and preview the page, then add it to the shared
variant/path list and CRM spec in a NEW period with a new ID, endpoint and cookie.
Preserve earlier specs and results. Update every participating page together.
The allocator divides evenly by the variant count. Draft/enable controls and
automatic period creation are not implemented; these are code changes for now.
