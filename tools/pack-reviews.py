"""Write the Google reviews wall into all eight Italian Pack v5 pages.

Re-runnable: replaces the block between <!-- PACK-REVIEWS --> markers, or on the
first run, the old single-quote / review-card section. Quotes are verbatim from
the Google reviews in ricci/business/marketing/reviews.txt (trimmed with "…").
"""
import html, re, pathlib

SHOP = pathlib.Path(__file__).resolve().parent.parent / "site/shop"
PAGES = [f"pittsburgh-italian-pack-{v}.html" for v in
         ["butcher", "free", "minimal", "butcher-free", "butcher-sauce", "free-sauce", "minimal-sauce", "butcher-free-sauce"]]

REVIEWS = [  # (name, note, quote, featured)
    ("Josh C.", "Customer for years", "Best sausage in Pittsburgh! Grills up so well and has the best taste you can find in this area. I’ve had the hot and sweet. Both are awesome, but the hot is so good, I find myself thinking about it well after it is gone.", True),
    ("Adam K.", "Google review", "Listen, if you haven’t had hot sausage from this place, stop what you’re doing and go get it. I will never get my sausage anywhere else now. The best sausage I’ve ever had!", True),
    ("Dale P.", "Lives in North Carolina", "Love their sausages! Living in NC, it’s hard to find truly great Italian food, so every time we come back to the Pittsburgh area, we make sure to stock up and bring some home with us.", True),
    ("Beau C.", "Google review", "Go out of your way for Ricci’s sausage. Grab a bite there if you want, but most certainly take some home to share with friends and family.", False),
    ("Armand M.", "Google review", "Hot sausage has great flavor and you get 20 pieces out of a 5 lb. box.", False),
    ("William Z.", "Google review", "Delicious sausage and meatballs in red sauce. A Pittsburgh classic.", False),
    ("Brittany U.", "Google review", "Always get my sausage from here for cooking! While you’re there, get a hot sandwich, the meatball is my favorite and you won’t be disappointed!", False),
    ("Tamandra T.", "First visit", "Friendly ladies and the freshest hot Italian sausage!", False),
    ("Mike S.", "Google review", "This was the best Italian sweet sausage sandwich I’ve ever tasted! I will be back again… and will be getting extras for dinners, lunch for me and my wife.", False),
    ("Frank M.", "Google review", "You will not be disappointed by the sausage, lasagna, meatballs. Every single item on their menu is great.", False),
    ("Richard L.", "Moved back to Pittsburgh", "Whether it’s a quick take out or putting together an entire meal, I highly recommend Ricci’s. The reason it’s so popular is that it’s friendly people and good food.", False),
    ("Bill H.", "Google review", "Ricci’s has the best Italian sausage in Pittsburgh!", False),
]

G = ('<svg class="pr-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>'
     '<path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>'
     '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>'
     '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>')
STARS = '<div class="pr-stars" role="img" aria-label="5 out of 5 stars">★★★★★</div>'

def card(name, note, quote, big):
    e = html.escape
    return (f'<figure class="pr-card{" pr-big" if big else ""}">{STARS}<blockquote>“{e(quote, quote=False)}”</blockquote>'
            f'<figcaption><span class="pr-av" aria-hidden="true">{e(name[0])}</span><div><strong>{e(name)}</strong>'
            f'<span>{e(note)}</span></div>{G}</figcaption></figure>')

BLOCK = ("<!-- PACK-REVIEWS (tools/pack-reviews.py) -->"
         '<section class="pr" id="reviews" data-lp="reviews"><div class="pr-wrap"><div class="pr-head"><div>'
         '<p class="pr-kicker">From the counter</p><h2>Pittsburgh keeps coming back.</h2></div>'
         f'<div class="pr-badge">{G}<div>{STARS}<span>Five-star reviews from Google</span></div></div></div>'
         f'<div class="pr-grid">{"".join(card(*r) for r in REVIEWS)}</div>'
         '<p class="pr-foot">Real reviews from our Google Business listing, McKees Rocks, PA.</p>'
         "</div></section><!-- /PACK-REVIEWS -->")

CSS = '<link rel="stylesheet" href="../css/pack-reviews.css">'
OLD_GX = re.compile(r'<section class="gx-wrap gx-section"><p class="gx-kicker">From the counter</p>.*?</section>', re.S)
OLD_B = re.compile(r'<!-- REVIEWS -->\s*<section class="menu-section">.*?<div class="reviews-grid">.*?(?=<div class="press-review-card">)', re.S)
MARKED = re.compile(r"<!-- PACK-REVIEWS.*?<!-- /PACK-REVIEWS -->", re.S)

for name in PAGES:
    p = SHOP / name
    s = p.read_text()
    if MARKED.search(s):
        s = MARKED.sub(lambda _: BLOCK, s)
    elif OLD_GX.search(s):
        s = OLD_GX.sub(lambda _: BLOCK, s, count=1)
    elif OLD_B.search(s):
        # B keeps its ESPN card, now on its own under the reviews wall.
        s = OLD_B.sub(lambda _: BLOCK + '\n      <section class="menu-section"><div class="container"><div class="reviews-grid">', s, count=1)
    else:
        raise SystemExit(f"{name}: no reviews section found")
    if CSS not in s:
        s = s.replace("</head>", CSS + "\n</head>", 1)
    p.write_text(s)
    print("ok", name)
