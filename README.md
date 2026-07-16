# قيد البلوت

An Arabic-first Baloot scorekeeper for people playing with physical cards. It calculates the round, keeps the match history, works offline, and announces playful Saudi callouts at the right moments.

## Features

- Large across-the-table scoreboard for **لنا / لهم**
- Sun and Hokm raw-point conversion
- Sira, Fifty, Hundred, Four Hundred, and Baloot projects
- Normal, Double, Triple, Four, and Coffee rounds
- Automatic buyer-failure detection
- Manual correction for house-rule differences
- Edit or undo any recorded round
- Local persistence with no login or backend
- Installable offline web app with optional screen wake lock
- Replaceable Arabic MP3 callouts with browser-speech fallback

## Run locally

```bash
npm install
npm run dev
```

Validation:

```bash
npm test
npm run build
```

## Sounds

Place recorded MP3s in `public/sounds/`. Filenames and scripts are documented in [`public/sounds/README.md`](public/sounds/README.md).

## Scoring note

The calculator uses common Saudi Sun/Hokm conversion, normal buyer failure, and winner-takes-round multiplier behavior. Baloot tables sometimes use different project or multiplier conventions, so the confirmation sheet always shows the calculated registration and includes a manual correction switch.

Rule references:

- [Saudi Federation for Mind Sports](https://www.sfms.sa/about-us)
- [Koutchina Baloot rules](https://koutchina.app/en/rules/baloot)
- [Jawaker Baloot rules](https://blog.jawaker.com/en/baloot-rules-en/amp/)
- [PlayLah Baloot rules](https://playlah.helpshift.com/hc/en/3-playlah/faq/87-baloot/)
