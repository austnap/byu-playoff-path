# BYU Playoff Path

Live site: BYU's two routes into the 12-team College Football Playoff.

- **Overall**: BYU's playoff odds and this week's games to root for.
- **Big 12 title**: exact odds (every remaining outcome, official Big 12 tiebreakers), game picker, path builder.
- **At-large**: committee-model projection for the next ranking and the final field.

## How it updates
- Live scores: the page pulls ESPN every 10 seconds in the browser.
- Model: `.github/workflows/update.yml` runs `scripts/run.sh` every 10 minutes Fri-Sun and every 6 hours. The full model reruns when a watched game goes final.
- Run it by hand: Actions → Refresh odds → Run workflow.

## Committee model
`scripts/cfp/fit.js` learns weights from real CFP committee rankings (2024, 2025, 2026) pulled by `train_pull.js`. Refit: `cd scripts/cfp && node train_pull.js && node fit.js`.
