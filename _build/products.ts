// Product data for Ricci's Italian Sausage page generator.
// Edit here, then `bun run _build/generate.ts` to rebuild product pages + footers.

export type GroceryProduct = {
  slug: string;
  name: string;
  shortName: string;       // for related-products / footer
  tag: string;
  price: string;           // display string
  priceNote: string;       // ship note under price
  ctaLabel: string;
  ctaPrimary: boolean;     // true => filled gold, false => outline
  weight: string;
  hero: string;            // 1-2 sentences for hero
  description: string;     // 2-3 sentences for body
  ingredients: string;
  cookMethods: { title: string; body: string }[];
  servingIdeas: string;    // 1 paragraph
  faq: { q: string; a: string }[];
  image: string;           // path relative to ../assets/img/
  metaTitle: string;
  metaDesc: string;
};

export type HotFoodProduct = {
  slug: string;
  name: string;
  shortName: string;
  tag?: string;
  price: string;
  availability: string;    // e.g. "Mon–Sat", "Wed & Sat", "Friday only"
  hero: string;
  description: string;
  ingredients: string;
  story?: string;
  catering?: string;
  metaTitle: string;
  metaDesc: string;
};

export const grocery: GroceryProduct[] = [
  {
    slug: "sweet-italian-sausage",
    name: "Classic Sweet Italian Sausage",
    shortName: "Sweet Italian Sausage",
    tag: "Best Seller",
    price: "$59.95",
    priceNote: "+ Shipping · Arrives Frozen",
    ctaLabel: "Add to Cart",
    ctaPrimary: false,
    weight: "3 lbs · Fresh-frozen for shipping",
    hero: "The original recipe since 1945. Abruzzo-style — cracked black pepper, the Sulmona family spice blend, no fennel or garlic. A boutique sausage, hand-mixed in small batches at the McKees Rocks shop.",
    description: "Mild, savory, balanced. We make it in small batches — roughly 200 lbs at a time — hand-mixing every spice and using real paprika instead of the liquid extract bigger producers run. Lean (22–25% fat, well under the federal limit), low sodium, all natural. We hand-stuff every link in McKees Rocks and ship it frozen so it arrives tasting like the case at the shop.",
    ingredients: "Pork, water, salt, black pepper, real paprika, family spice blend. Natural casing. No fennel, no garlic, no fillers, no MSG, no additives, no preservatives.",
    cookMethods: [
      { title: "On the stovetop", body: "Brown links over medium heat in a heavy pan with a splash of water. Cover, cook 12–15 min, finish uncovered to crisp the casing." },
      { title: "On the grill", body: "Medium heat, turn every 2–3 min. About 15–18 min total. Internal temp 160°F." },
      { title: "In Sunday gravy", body: "Brown links first, then drop into simmering San Marzano sauce for 90 minutes. The fat renders into the gravy. That's the whole secret." },
    ],
    servingIdeas: "Sausage, peppers, and onions on a Mancini's roll. Sliced into pasta with broccoli rabe. Grilled with a side of polenta. Crumbled on pizza. The classics work for a reason.",
    faq: [
      { q: "How is it shipped?", a: "Vacuum-sealed and frozen, packed in an insulated box with dry ice. Ships Monday–Wednesday so it arrives before the weekend." },
      { q: "How long does it keep?", a: "Up to 6 months in the freezer, 5 days in the fridge after thawing." },
      { q: "Can I order in larger quantities?", a: "Yes — call the shop at 412-331-9531 for 10+ lb orders or restaurant wholesale." },
    ],
    image: "sausage-peppers.webp",
    metaTitle: "Classic Sweet Italian Sausage — Ricci's | Shipped Nationwide",
    metaDesc: "The original Ricci's sweet Italian sausage, made in Pittsburgh since 1945. 3 lbs, USDA inspected, shipped frozen anywhere in the country.",
  },
  {
    slug: "hot-italian-sausage",
    name: "Hot Italian Sausage",
    shortName: "Hot Italian Sausage",
    tag: "Fan Favorite",
    price: "$59.95",
    priceNote: "+ Shipping · Arrives Frozen",
    ctaLabel: "Add to Cart",
    ctaPrimary: false,
    weight: "3 lbs · Fresh-frozen for shipping",
    hero: "Same family recipe, with crushed red pepper, real paprika, and whole fennel seed. Hand-mixed in small batches at the McKees Rocks shop.",
    description: "Hot but not punishing — the heat builds slow, the way an Italian grandmother would have made it. Boutique sausage, 200-lb batches, real paprika (not liquid extract), whole fennel seed (we don't buy it ground), 22–25% fat. Pat McAfee's pick on ESPN GameDay. The hot sausage we put in our famous sandwich since 1945.",
    ingredients: "Pork, water, salt, whole fennel seed, garlic, crushed red pepper, black pepper, real paprika, family spice blend. Natural casing. All natural — no fillers, no MSG, no additives, no preservatives.",
    cookMethods: [
      { title: "On the stovetop", body: "Brown over medium heat with a splash of water. Cover 12–15 min, finish uncovered to crisp the casing." },
      { title: "On the grill", body: "Medium heat, turn every 2–3 min. 15–18 min total. Internal temp 160°F." },
      { title: "In Sunday gravy", body: "Brown the links, drop into simmering San Marzano sauce for 90 minutes. The pepper bleeds into the gravy — exactly what you want." },
    ],
    servingIdeas: "On a Mancini's roll with peppers, onions, and Grande cheese — that's the Ricci's hot sausage sandwich, the one Pittsburgh has been ordering since 1945. Also: sliced over rigatoni, on pizza, or crumbled into stuffed peppers.",
    faq: [
      { q: "How hot is it really?", a: "Medium heat. It builds — you feel it on the third bite, not the first. Most people who say they don't like spicy food still finish the sandwich." },
      { q: "How is it shipped?", a: "Vacuum-sealed, frozen, packed with dry ice. Ships Monday–Wednesday." },
      { q: "How long does it keep?", a: "6 months frozen, 5 days in the fridge after thawing." },
    ],
    image: "sausage-roll.webp",
    metaTitle: "Hot Italian Sausage — Ricci's | Shipped Nationwide",
    metaDesc: "Ricci's hot Italian sausage. Same family recipe since 1945, with crushed red pepper. USDA inspected, 3 lbs, shipped frozen.",
  },
  {
    slug: "italian-meatballs",
    name: "Homemade Italian Meatballs",
    shortName: "Italian Meatballs",
    tag: "Hand-Rolled",
    price: "$49.95",
    priceNote: "+ Shipping · Arrives Frozen",
    ctaLabel: "Add to Cart",
    ctaPrimary: false,
    weight: "2 lbs · ~16 meatballs at 2 oz each",
    hero: "Lil's recipe. Hand-rolled, seasoned with the family spice blend, made the way they're made at the counter every morning.",
    description: "Tender, well-seasoned, never dense. Beef, pork, ricotta, parmesan, fresh parsley, garlic, breadcrumbs — the way an Italian household makes them when they expect you for dinner. We roll every meatball by hand in McKees Rocks, in small batches, with the same hand-mixed family spice blend.",
    ingredients: "Beef, pork, ricotta, parmesan, eggs, breadcrumbs, garlic, parsley, salt, black pepper, family spice blend. All natural — no fillers, no MSG, no additives, no preservatives.",
    cookMethods: [
      { title: "In the oven", body: "Thaw, place on a sheet pan, 400°F for 18–20 min. Transfer into simmering sauce to finish." },
      { title: "Direct into sauce", body: "Drop frozen meatballs into simmering San Marzano sauce. 45 min covered, 15 min uncovered. They release their fat into the gravy." },
      { title: "Pan-fried", body: "Brown all sides over medium heat in a little olive oil, 8–10 min. Finish in sauce or serve straight." },
    ],
    servingIdeas: "On Mancini's bread with sauce and Grande cheese — that's the meatball sandwich at the counter. Over rigatoni or spaghetti. As an appetizer with toothpicks. In a Sunday gravy with sausage and braciole.",
    faq: [
      { q: "How many meatballs in a 2 lb pack?", a: "About 16, at 2 oz each. Roughly 4 servings as an entrée." },
      { q: "Are they fully cooked?", a: "No — shipped raw and frozen. Cook to 160°F internal." },
      { q: "How long do they keep?", a: "6 months frozen, 3–4 days in the fridge after thawing." },
    ],
    image: "sausage-peppers.webp",
    metaTitle: "Homemade Italian Meatballs — Ricci's | Shipped Nationwide",
    metaDesc: "Lil's hand-rolled Italian meatballs. Beef, pork, ricotta, the Ricci family recipe. 2 lbs, shipped frozen.",
  },
  {
    slug: "pittsburgh-italian-pack",
    name: "The Pittsburgh Italian Pack",
    shortName: "Pittsburgh Italian Pack",
    tag: "Gift · Free Shipping",
    price: "$99.95",
    priceNote: "Free Shipping · Arrives Frozen",
    ctaLabel: "Add to Cart",
    ctaPrimary: true,
    weight: "8 lbs total — 3 lb sweet sausage, 3 lb hot sausage, 2 lb meatballs",
    hero: "The full Sunday table. Sweet sausage, hot sausage, and hand-rolled meatballs — everything you need for one serious Italian dinner.",
    description: "Our most ordered bundle. The three things Pittsburgh has been buying at the counter since 1945, packed together with free shipping. Feeds a family of six with leftovers. Makes a serious housewarming gift.",
    ingredients: "See individual product pages for full ingredient lists. All USDA-inspected, hand-mixed, all natural — no fillers, no MSG, no additives, no preservatives.",
    cookMethods: [
      { title: "Sunday gravy for six", body: "Brown all three meats in batches. Drop into 4 quarts of simmering San Marzano sauce. Simmer 90 min covered, 30 min uncovered. Serve over rigatoni with bread." },
      { title: "Sandwich night", body: "Hot sausage with peppers and onions on Mancini's. Sweet sausage with sauce and Grande. Meatball with sauce and cheese. Three sandwiches, one family." },
      { title: "Freezer strategy", body: "Portion into 1 lb bags before freezing — pull what you need for any given dinner. The bundle covers four to six meals." },
    ],
    servingIdeas: "A complete Italian Sunday: gravy with all three meats over rigatoni, garlic bread, salad, red wine. Or split it across the week — sausage and peppers Monday, meatball subs Wednesday, sausage pizza Friday.",
    faq: [
      { q: "Why is shipping free on this one?", a: "Bundles ship at a flat cost we absorb. Smaller single items don't have the margin." },
      { q: "Can I substitute?", a: "Not on this bundle — it's a fixed pack. For custom mixes, call the shop at 412-331-9531." },
      { q: "How is it packaged?", a: "Each item is vacuum-sealed and labeled, packed in an insulated box with dry ice." },
    ],
    image: "sausage-peppers.webp",
    metaTitle: "The Pittsburgh Italian Pack — Ricci's Bundle | Free Shipping",
    metaDesc: "Sweet sausage, hot sausage, and hand-rolled meatballs. The full Ricci's Sunday table, shipped frozen with free shipping.",
  },
  {
    slug: "ricci-legacy-gift-box",
    name: "The Ricci Legacy Gift Box",
    shortName: "Legacy Gift Box",
    tag: "Gift Box · Free Shipping",
    price: "$129.95",
    priceNote: "Free Shipping · Premium Packaging",
    ctaLabel: "Add to Cart",
    ctaPrimary: true,
    weight: "10 lbs total — sweet sausage, hot sausage, meatballs, stuffed peppers",
    hero: "Our full range, beautifully packaged. The gift for the Italian food lover in your life — or the one you want to introduce to real Italian sausage.",
    description: "Sweet sausage, hot sausage, hand-rolled meatballs, and Lil's stuffed banana peppers — packed in a custom Ricci's box with a hand-written note from the family. The gift that arrives and people remember. Comes with a recipe card for Sunday gravy.",
    ingredients: "See individual product pages. Includes the stuffed banana pepper recipe (banana peppers stuffed with hot sausage and homemade San Marzano sauce).",
    cookMethods: [
      { title: "If it's a gift", body: "We'll include a hand-written note (write what you want at checkout) and a printed Ricci family Sunday gravy recipe card. Premium packaging." },
      { title: "If it's for you", body: "Sausage and peppers Monday. Meatball subs Wednesday. Stuffed peppers Friday. Sausage pizza Saturday. One box, a week of Italian dinners." },
      { title: "For the freezer", body: "Everything is shipped frozen and stays good 6 months. Pull what you need." },
    ],
    servingIdeas: "Open the box, pour a glass of red, start a sauce. The legacy box is built for a real Italian feast — sausage two ways, meatballs in gravy, stuffed peppers as a side. Pittsburgh on a plate.",
    faq: [
      { q: "Can I add a personal note?", a: "Yes — there's a note field at checkout. We hand-write it on a Ricci's card." },
      { q: "Can I ship to a different address?", a: "Yes — set a separate ship-to address at checkout. Great for housewarmings, holidays, condolences." },
      { q: "What if they don't have a freezer?", a: "Most of it goes in the fridge for the week. The bundle is sized for two people to eat through in 5–7 days." },
    ],
    image: "sausage-peppers.webp",
    metaTitle: "The Ricci Legacy Gift Box | Italian Sausage Gift, Free Shipping",
    metaDesc: "Sweet sausage, hot sausage, meatballs, and stuffed peppers in a hand-packed gift box. Free shipping nationwide.",
  },
  {
    slug: "feast-seven-fishes",
    name: "Feast of the Seven Fishes Bundle",
    shortName: "Feast of the Seven Fishes",
    tag: "Seasonal · Free Shipping",
    price: "$149.95",
    priceNote: "Free Shipping · Limited Seasonal",
    ctaLabel: "Add to Cart",
    ctaPrimary: true,
    weight: "12 lbs total — sausage, meatballs, stuffed peppers, plus recipe card",
    hero: "The complete Italian Christmas Eve table. Sausage, meatballs, stuffed peppers — and a hand-written recipe card from the Ricci family.",
    description: "La Vigilia di Natale. Christmas Eve. The night Italian families gather for the Feast of the Seven Fishes — and the meats that anchor the table the rest of the week. This bundle ships in November–December only. When the season is over, it's gone.",
    ingredients: "See individual product pages. Includes a hand-written Ricci family recipe card for the meat side of the feast.",
    cookMethods: [
      { title: "The night-of plan", body: "Sweet and hot sausage with peppers as antipasto. Meatballs in gravy as primo. Stuffed peppers as contorno. The fish goes on its own — this bundle covers everything else." },
      { title: "The week before", body: "Bundle ships frozen, holds in the freezer for the season. Pull and thaw 24 hours before the meal." },
      { title: "Leftover strategy", body: "The day-after panini with hot sausage and meatballs is its own tradition." },
    ],
    servingIdeas: "The traditional Italian-American Christmas Eve: seven seafood courses plus the meat that makes it a real feast. Or a New Year's Day open house. Or a Sunday dinner that takes the whole afternoon.",
    faq: [
      { q: "When does this ship?", a: "November 1 through December 22 only. Order by December 15 for guaranteed Christmas Eve delivery." },
      { q: "Does it include fish?", a: "No — fish ships separately and we don't carry it. This is the meat half of the feast." },
      { q: "Can I order it year-round?", a: "No, this is the only bundle we hold to the season. The Pittsburgh Italian Pack and Legacy Box are available year-round." },
    ],
    image: "sausage-peppers.webp",
    metaTitle: "Feast of the Seven Fishes Bundle — Ricci's | Italian Christmas Eve",
    metaDesc: "The Italian Christmas Eve table from Ricci's. Sausage, meatballs, stuffed peppers, and a Ricci family recipe card. Free shipping, seasonal only.",
  },
  {
    slug: "sausage-club",
    name: "The Ricci Sausage Club",
    shortName: "The Sausage Club",
    tag: "Subscribe & Save",
    price: "$59.95<span style='font-size:0.7em;color:#999;font-family:var(--font-sans);font-weight:400'> /mo</span>",
    priceNote: "Free Shipping · Cancel Anytime",
    ctaLabel: "Subscribe",
    ctaPrimary: true,
    weight: "3 lbs/month — rotating selection",
    hero: "A different variety every month. Rotating seasonal cuts, member-only recipes, and early access to limited editions.",
    description: "The Sausage Club is for the people who already know. Every month we ship 3 lbs of a rotating cut — sweet, hot, fennel-heavy, the spicy seasonal — with a member-only recipe card and early access to limited drops. Cancel anytime, no contract.",
    ingredients: "Varies by month. All USDA-inspected, hand-mixed in small batches, all natural — no fillers, no MSG, no additives, no preservatives.",
    cookMethods: [
      { title: "Member recipe card", body: "Each month's box ships with a Ricci family recipe matched to the cut — the way Lil would have cooked it on a Tuesday." },
      { title: "First-month access", body: "New subscribers get the current month's cut plus a second 1 lb sample of the upcoming month." },
      { title: "Holiday months", body: "December ships the Feast of the Seven Fishes cut. May ships fennel-and-orange spring sausage. October ships the smoke-paprika seasonal." },
    ],
    servingIdeas: "Treat it like a wine club — the box arrives, you cook from the recipe card that night. Members report the recipe card is the best part. Free shipping on every box.",
    faq: [
      { q: "Can I skip a month?", a: "Yes — log in to your account and skip up to 3 months at a time." },
      { q: "Can I cancel?", a: "Anytime, no fees, no questions. Cancel from the account page or call 412-331-9531." },
      { q: "Can I gift the club?", a: "Yes — 3, 6, and 12 month gift subscriptions. Pre-paid, no auto-renew." },
    ],
    image: "sausage-roll.webp",
    metaTitle: "The Ricci Sausage Club | Monthly Italian Sausage Subscription",
    metaDesc: "A new cut of Ricci's Italian sausage every month plus a Ricci family recipe card. Free shipping, cancel anytime.",
  },
  {
    slug: "mangia-salsiccia-cookbook",
    name: "Mangia Salsiccia! Cookbook",
    shortName: "Mangia Salsiccia! Cookbook",
    tag: "Charity Cookbook",
    price: "$24.95",
    priceNote: "Media Mail Shipping",
    ctaLabel: "Add to Cart",
    ctaPrimary: false,
    weight: "Hardcover, 184 pages",
    hero: "Three generations of Ricci family recipes. The original sausage recipe is still a secret. Everything else is in the book.",
    description: "Sunday gravy, stuffed peppers, sausage rolls, lasagna, Pasta e' Fagioli, Lil's meatballs — written down for the first time. Includes a foreword from the Ricci family and photos from the McKees Rocks shop. 100% of proceeds support local Pittsburgh food charities.",
    ingredients: "Hardcover, 184 pages, full color photography, 60+ recipes.",
    cookMethods: [
      { title: "Cook through it", body: "The book is built for a real Italian household — Sunday gravy, weekday quick dinners, holiday feasts, party trays. 60+ recipes." },
      { title: "Read it first", body: "Foreword from the Ricci family. Photos from the McKees Rocks shop and the Sulmona family kitchen." },
      { title: "Gift it", body: "Pairs with any of our sausage bundles — book + meat is the household-warming gift that lands." },
    ],
    servingIdeas: "Cook a recipe a week and you'll be cooking from the book for over a year. Pittsburgh food writers have called it the most honest Italian-American cookbook out of Western PA.",
    faq: [
      { q: "Where do the proceeds go?", a: "100% of profit (after print and shipping cost) goes to Pittsburgh-area food banks and charities. The Ricci family covers all overhead." },
      { q: "How is it shipped?", a: "USPS Media Mail — 5–7 business days, low cost." },
      { q: "Can I get it signed?", a: "Yes — note 'signed copy' at checkout and we'll have a member of the Ricci family sign it before shipping." },
    ],
    image: "sausage-roll.webp",
    metaTitle: "Mangia Salsiccia! — The Ricci Family Italian Cookbook",
    metaDesc: "Three generations of Ricci family Italian recipes. 60+ recipes, hardcover, 100% of proceeds to Pittsburgh charity.",
  },
];

export const hotFoods: HotFoodProduct[] = [
  {
    slug: "hot-sausage-sandwich",
    name: "Ricci's Famous Hot Sausage Sandwich",
    shortName: "Famous Hot Sausage",
    tag: "Signature",
    price: "$6.75",
    availability: "Mon–Sat",
    hero: "The sandwich Pittsburgh has been lining up for since 1945.",
    description: "Hot Italian sausage with tri-colored peppers and onions, our homemade San Marzano sauce, topped with melted Grande cheese — all served on a fresh Mancini's roll. Pat McAfee's pick on ESPN GameDay. The reason most people walk in.",
    ingredients: "Hot Italian sausage, tri-colored peppers and onions, homemade San Marzano sauce, Grande mozzarella, Mancini's bread.",
    story: "It's the original Ricci sandwich. Eighty years, same recipe, same counter. If you're new to Ricci's, this is what you order first.",
    catering: "Available as a catering tray (12 or 24 pieces) — see the catering page or call the shop with 24 hours notice.",
    metaTitle: "Ricci's Famous Hot Sausage Sandwich | McKees Rocks, PA",
    metaDesc: "The Ricci's hot sausage sandwich since 1945. Tri-colored peppers, San Marzano sauce, Grande cheese, on Mancini's bread. McKees Rocks, PA.",
  },
  {
    slug: "sweet-sausage-sandwich",
    name: "Sweet Sausage Sandwich",
    shortName: "Sweet Sausage Sandwich",
    price: "$6.75",
    availability: "Mon–Sat",
    hero: "Same family recipe, no heat. Tri-colored peppers, natural juices, Grande cheese, Mancini's bread.",
    description: "Our classic sweet Italian sausage with tri-colored peppers and onions, finished with melted Grande cheese on a Mancini's roll. Served with the natural juices — if you want San Marzano sauce on it, just tell us at the counter.",
    ingredients: "Sweet Italian sausage, tri-colored peppers and onions, Grande mozzarella, Mancini's bread. Sauce on request.",
    catering: "Available as a catering tray (12 or 24 pieces) — see the catering page.",
    metaTitle: "Sweet Italian Sausage Sandwich | Ricci's, McKees Rocks, PA",
    metaDesc: "Ricci's sweet Italian sausage sandwich. Tri-colored peppers, Grande cheese, Mancini's bread. Pittsburgh since 1945.",
  },
  {
    slug: "banana-pepper-sandwich",
    name: "Ernie's Hot Banana Pepper Sandwich",
    shortName: "Ernie's Banana Pepper",
    price: "$6.75",
    availability: "Mon–Sat",
    hero: "Hot banana peppers stuffed generously with our hot sausage, sauce, and Grande cheese. Named for Ernie.",
    description: "Hot banana peppers — the long ones — split, stuffed with our hot Italian sausage, finished in homemade San Marzano sauce, topped with melted Grande cheese, served on Mancini's bread. Ernie's recipe. The deep cut order.",
    ingredients: "Hot banana peppers, hot Italian sausage, homemade San Marzano sauce, Grande mozzarella, Mancini's bread.",
    story: "Ernie's been at Ricci's since long before any of us. The stuffed banana pepper is his dish — he's the one we call when we run out, and we run them with his name on them.",
    catering: "Available by the piece or as a catering tray (6 or 12 pieces) — see catering.",
    metaTitle: "Ernie's Stuffed Banana Pepper Sandwich | Ricci's, McKees Rocks",
    metaDesc: "Ernie's hot banana peppers stuffed with Ricci's hot sausage, San Marzano sauce, Grande cheese, on Mancini's bread.",
  },
  {
    slug: "meatball-sandwich",
    name: "Lil's Homemade Meatball Sandwich",
    shortName: "Lil's Meatball Sandwich",
    price: "$6.75",
    availability: "Mon–Sat",
    hero: "Three of Lil's hand-rolled meatballs in homemade San Marzano sauce with melted Grande cheese on Mancini's bread.",
    description: "Tender, well-seasoned, never dense. Lil's recipe — beef, pork, ricotta, parmesan, fresh parsley — rolled by hand every morning. Three meatballs, sauce, Grande cheese, on Mancini's. The way it should be.",
    ingredients: "Hand-rolled meatballs (beef, pork, ricotta, parmesan, parsley, garlic, breadcrumbs), homemade San Marzano sauce, Grande mozzarella, Mancini's bread.",
    story: "Lil rolled meatballs at the shop for over forty years. The recipe is hers. We still make them by hand every morning — nobody's figured out how to do them better.",
    catering: "Available as a meatball tray (12 or 24 meatballs, 2 oz each) — see catering.",
    metaTitle: "Lil's Homemade Meatball Sandwich | Ricci's, McKees Rocks, PA",
    metaDesc: "Lil's hand-rolled Italian meatballs, San Marzano sauce, Grande cheese, on Mancini's bread. Pittsburgh since 1945.",
  },
  {
    slug: "sausage-rolls",
    name: "Lil's Sausage Rolls",
    shortName: "Sausage Rolls",
    tag: "Made Fresh Daily",
    price: "$10.00",
    availability: "Made fresh daily — go fast",
    hero: "Mancini's dough rolled with ground hot sausage, shredded Grande cheese, finished with olive oil and parmesan.",
    description: "Made fresh every morning at the shop. Mancini's pizza dough, ground hot sausage, melted Grande cheese — rolled, baked, finished with olive oil and parmesan. The grab-and-go that built our weekday lunch business.",
    ingredients: "Mancini's pizza dough, ground hot sausage, Grande mozzarella, olive oil, parmesan.",
    story: "Lil started making them as a way to use the hot sausage the shop ground each morning. Customers started asking for them by name. Now we make hundreds a week and they still sell out by mid-afternoon some days.",
    catering: "Available individually or as catering ($9.99 each in bulk). 24 hours notice helps us hold the count you need.",
    metaTitle: "Lil's Sausage Rolls | Ricci's, McKees Rocks, PA — Made Fresh Daily",
    metaDesc: "Lil's hot sausage rolls — Mancini's dough, ground hot sausage, Grande cheese, parmesan. Made fresh every morning at Ricci's.",
  },
  {
    slug: "sausage-lasagna",
    name: "Sausage Lasagna",
    shortName: "Sausage Lasagna",
    price: "$7.25 / serving",
    availability: "Wednesdays & Saturdays only",
    hero: "Homemade San Marzano sauce, Grande Sopraffina ricotta, three-cheese blend, ground hot sausage. By the serving or the tray.",
    description: "Layered properly — pasta, sauce, ricotta, three-cheese blend, ground hot sausage, repeat. Made in-house twice a week and sold by the serving until it's gone. If you want a whole tray, order it the day before.",
    ingredients: "Lasagna pasta, homemade San Marzano sauce, Grande Sopraffina ricotta, three-cheese blend (mozzarella, provolone, parmesan), ground hot sausage.",
    catering: "Available as a tray serving 12. Order 24 hours in advance — call 412-331-9531.",
    metaTitle: "Sausage Lasagna | Ricci's, McKees Rocks — Wed & Sat Special",
    metaDesc: "Ricci's homemade sausage lasagna — San Marzano sauce, Grande ricotta, three-cheese blend, hot sausage. Wednesdays and Saturdays only.",
  },
  {
    slug: "mac-and-cheese",
    name: "Mac 'n Cheese with Hot Sausage",
    shortName: "Mac 'n Cheese",
    price: "$4.95 sm · $5.99/lb",
    availability: "Tuesdays & Thursdays only",
    hero: "Real mac and cheese with our ground hot sausage. By the cup or by the pound.",
    description: "Cavatappi pasta, three-cheese sauce, ground hot Italian sausage. Made in-house every Tuesday and Thursday. By the cup at the counter or by the pound to take home and reheat.",
    ingredients: "Cavatappi pasta, three-cheese sauce (cheddar, mozzarella, parmesan), ground hot Italian sausage, butter, milk, salt, pepper.",
    catering: "Small catering tray available — call 412-331-9531 with 24 hours notice.",
    metaTitle: "Mac 'n Cheese with Hot Sausage | Ricci's — Tue & Thu Special",
    metaDesc: "Ricci's mac and cheese with ground hot Italian sausage. Made fresh Tuesdays and Thursdays in McKees Rocks.",
  },
  {
    slug: "pasta-e-fagioli",
    name: "Sherry's Pasta e' Fagioli",
    shortName: "Pasta e' Fagioli",
    price: "$4.95 srv · $9.99/qt",
    availability: "Fridays only",
    hero: "Homemade sauce, ground hot sausage, Ditalini pasta, cannellini beans. Served with a Mancini's roll.",
    description: "Sherry's recipe. Old-school Pasta Fazool the way it was made in the houses on the South Side — homemade San Marzano sauce, ground hot sausage, Ditalini pasta, cannellini beans, finished with parmesan. Comes with a Mancini's roll. Friday lunch, every Friday.",
    ingredients: "Homemade San Marzano sauce, ground hot Italian sausage, Ditalini pasta, cannellini beans, parmesan, herbs, Mancini's roll.",
    story: "Sherry's been making it on Fridays for as long as anyone at the shop can remember. The line goes around the corner some weeks.",
    metaTitle: "Sherry's Pasta e' Fagioli | Ricci's — Fridays Only",
    metaDesc: "Sherry's homemade Pasta Fazool with hot sausage and cannellini beans. Fridays only at Ricci's, McKees Rocks PA.",
  },
];

export const cateringItems = [
  { name: "Lil's Homemade Sausage Rolls", price: "$9.99 each" },
  { name: "Stuffed Banana Peppers", price: "Small (6 pc) $20.95 · Large (12 pc) $41.95" },
  { name: "Hot Italian Sausage", price: "Small (12 pc) $39.95 · Large (24 pc) $79.95" },
  { name: "Sweet Italian Sausage", price: "Small (12 pc) $39.95 · Large (24 pc) $79.95" },
  { name: "Meatballs (2 oz)", price: "Small (12 pc) $23.50 · Large (24 pc) $46.95" },
  { name: "Mac 'n Cheese w/ Hot Sausage", price: "Small Tray $36.95" },
  { name: "Sausage Lasagna", price: "Small Tray (12 servings) $71.95" },
  { name: "Mancini's Sausage Buns", price: "$6.00 / dozen" },
];
