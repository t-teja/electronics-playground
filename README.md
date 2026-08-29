# Electronics Playground

Interactive electronics laboratory. Open a bench, drag a slider, watch charge move.

Live: [https://t-teja.github.io/electronics-playground/](https://t-teja.github.io/electronics-playground/)
(after **Settings → Pages → Source: GitHub Actions**, and the Action is green).

## Benches

Resistor, capacitor, inductor, potentiometer, transformer, diode, LED, BJT, MOSFET, logic gates, 555 timer, microcontroller, signal generator, DC motor, relay.

## GitHub Pages

The repo includes a workflow that publishes on push to `main`.

1. Create the GitHub repository and push this project.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. After the first successful run, the lab is at:

   `https://<user>.github.io/<repo>/`

If the site 404s on `/lab/resistor`, wait for the Action to finish and confirm Pages is set to GitHub Actions (not “Deploy from a branch”).

Local static build:

```bash
BASE_PATH=/<repo>/ GH_PAGES=1 npm run build:pages
```

Output is `dist-pages/` (includes `404.html` and `.nojekyll` for client routing).

## Local preview

```bash
npm install
npm run dev
```
