# Grill Box urgency candidate

Candidate: `/shop/grill-box-urgency.html`.

Copies the current working-tree page A, retaining the $189 offer, all three blends, images, and Shopify checkout behavior. Adds a deadline panel immediately before the hero price/CTA and repeats the cutoff at the closing CTA. The shared control and current four-way test are untouched. No deployment performed.

## Weekly schedule

The deadline repeats automatically every week: Wednesday at noon Eastern for Friday delivery. The timer uses Eastern Time regardless of visitor timezone and advances to the following Wednesday after each cutoff. No campaign-specific configuration is required.

## Measurement / rollout

This is a standalone candidate, NOT an active A/B test. It deliberately omits `grill-experiment.js` and `grill-events.js` so it cannot redirect into v1 or contaminate old CRM results. Existing Meta/GA and checkout behavior are retained. A fresh 50/50 assignment, new experiment ID, CRM support, and purchase attribution still need implementation before using this for the proposed controlled test. Do not compare purchases from this candidate with the old four-way totals as though randomized together.

The recurring Wednesday-noon cutoff and Friday delivery target were confirmed for this candidate. Known existing copy issue: page A says everything is raw, but the peppers/onions preparation state is still unconfirmed; corrected in this copy to refer only to raw sausage.
