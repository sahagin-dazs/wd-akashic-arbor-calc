## Akashic Arbor Calculator

Akashic Arbor Calculator helps Wittle Defenders players squeeze every last percent out of their hero pool. You can record every hero you own, flag the ones you do not have, build a five hero lineup, and let the optimizer assign heroes to role or element nodes based on real slot unlock thresholds.

### Feature Highlights
1. Track every hero with a single dropdown that supports real star, moon, diamond, and rainbow levels plus a dedicated Not Owned state that greys out the card.
2. Lineup cards mirror the in game presentation with element based gradients, avatar art from `public/avatars`, and a quick toggle for priority targets.
3. Filters cover search, rarity, role, element, and ownership, while the toolbar always shows how many heroes are visible and how many you have already classified.
4. Nightmare settings live in their own panel with a large, touch friendly input and automatic persistence so the correct slot counts are used every time you optimize.
5. The Optimize Arbor button runs a backtracking search that ignores unowned heroes, honors node unlock levels, and only activates after every hero has been classified and the lineup is full.

### Getting Started
1. Install dependencies\
   ```bash
   npm install
   ```
2. Start the dev server\
   ```bash
   npm run dev
   ```
   Vite prints a local URL. Open it in your browser to view the app.
3. Create a production build\
   ```bash
   npm run build
   ```
   The compiled files land in `dist/`.

### Running with Docker
You can also build and serve the app entirely inside Docker:

1. Build the image
   ```bash
   docker build -t wd-akashic-arbor-calc .
   ```
2. Start the container (the app listens on port 4173 by default)
   ```bash
   docker run --rm -p 4173:4173 wd-akashic-arbor-calc
   ```
3. Visit `http://localhost:4173` in your browser.

### Running with Docker Compose
The repo ships with a `docker-compose.yml` that exposes both the dev server and the production image.

- Development server (hot reload on port 5173)
  ```bash
  docker compose up akashic-arbor-dev
  # open http://localhost:5173
  ```
- Production build served via Nginx (port 8080)
  ```bash
  docker compose up akashic-arbor
  # open http://localhost:8080
  ```

### Deploying to GitHub Pages
The repository includes a workflow (`.github/workflows/deploy.yml`) that builds the app and publishes the `dist/` folder to GitHub Pages.

1. Push the project to a GitHub repository (default branch `main`).
2. In the repository settings, enable “GitHub Pages” and select “GitHub Actions” as the source.
3. On the next push to `main` (or via the **Run workflow** button), the action will:
   - Install dependencies via `npm ci`
   - Run `npm run build` with `GITHUB_PAGES=true` so Vite uses the `/wd-akashic-arbor-calc/` base path
   - Upload and deploy the artifact to Pages
4. Your site will be available at `https://<username>.github.io/wd-akashic-arbor-calc/`.

### Using the App
1. Visit the Hero Collection section and set each dropdown to the proper star level or Not Owned. The summary displays how many entries still need attention.
2. Use the role, element, rarity, and ownership chips plus the search input to narrow down the list. All choices persist in `localStorage`.
3. Check the Add to lineup box on any owned hero to place it into one of the five slots. Each lineup card exposes a Priority Target checkbox and an X button to clear the slot.
4. Enter your current nightmare level. Slot counts for every node update according to this table: Fire (0/24/48), Ice (8/32/56), Electric (11/35/59), Wind (14/38/62), Fighter (17/41/65), Mage (20/44/68), Ranger (23/47/71), Support (26/50/74), Xeno (29/53/77).
5. The Optimize Arbor button remains disabled until all five lineup slots are filled and every hero is marked as owned or not owned. Once enabled, clicking it calculates the ideal node assignment and a buff summary for your priority heroes.

### Hero Art
Avatar PNGs live in `public/avatars/`. Each file should be named after the hero abbreviation with punctuation removed, for example `SR.png` for Scarlet Reaper or `UnyieldingLancer.png` for Unyielding Lancer. Transparent 100x100 circles look best.

### Support This Tool
If the calculator saves you time, consider supporting its development: [Support this tool](https://www.buymeacoffee.com/sahagin). Contributions help cover maintenance and future feature work.
