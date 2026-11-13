# Nightlife consultation seed

Question: **Ce facem cu viața de noapte din centru?**

`responses.json` contains 50 synthetic Romanian responses, with 10 each from
residents, bar owners, students, elderly people, and tourists. All people and
situations are fictional; these are demo inputs, never real participation or votes.
The equal group sizes are a demo design, not a population estimate.

Each record has a stable `id`, a contextual `group`, and raw citizen `text`.
Groups describe the speaker context, not expected opinion clusters: each group
includes disagreement, compromise, and uncertainty. Do not use these labels as
clustering features or ground truth. Feed `text` to intake and use the resulting
shared Pydantic models for clustering once the backend contract is available.

Themes include opening hours, terrace noise, soundproofing, enforcement, night
transport, safety, cleaning, accessibility, and cultural events. Some answers
contain multiple arguments intentionally, to exercise intake splitting.

Validate without installing dependencies:

```sh
python3 seed/validate.py
```
