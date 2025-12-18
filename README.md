## WD Tools

WD Tools bundles the Akashic Arbor optimizer and a summon simulator into a single responsive site. Track every hero you own, maximize Arbor buffs, and experiment with Warrior/Rate-Up/Xenoscape summon odds with persistent pity counters and resource pools.

**Live app:** https://sahagin-dazs.github.io/wd-akashic-arbor-calc/

### Tools included
- **Akashic Arbor Optimizer** – Save star levels for the entire hero collection, set Nightmare progress, rank lineup priorities 1-5, and let the optimizer assign role/element slots using the real unlock table.
- **Summon Simulator** – Configure Warrior wishlists, monthly/weekly rate-up banners, Xenoscape targets, pity counters, scrolls, and gem reserves. Run 1x or 10x rolls and review history for every banner.

### Analytics (optional)
If you want to track usage with Google Analytics 4, set your measurement ID before building:

1. Create a `.env` file in the project root with:
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
2. Restart `npm run dev` (if it was running) or run `npm run build`. The app automatically loads GA when the env variable is defined.

### What is the Akashic Arbor?
- In Wittle Defenders, the Akashic Arbor unlocks once your account reaches level 35 and is at least eight days old. The tool surfaces that info in-app so new players know when to expect it.
- Every node on the tree represents either a role or an element and contains up to three slots. A hero can only occupy one slot at a time (role *or* element).
- Slotting a hero grants ATK/DEF/HP bonuses based on the value printed in-game: lineup heroes that match the node receive **3×** the listed percentage while all other heroes receive **1×** that value. Stacking multiple nodes multiplies the effect.
- Nightmare progress controls how many slots are available for each node - this calculator mirrors those thresholds so you never plan for a slot you have not unlocked yet.

[Example Akashic Arbor](./public/images/arbor.jpg)

### Feature Highlights
1. Top navigation lets you jump between the Arbor optimizer and the Summon Simulator while highlighting untracked heroes everywhere via warning badges.
2. Hero cards stay synced across both views thanks to `localStorage` – the simulator automatically knows which heroes you own, while the optimizer blocks untracked heroes from entering the lineup.
3. Lineup cards mirror the in-game look with element gradients, avatar art from `public/avatars`, priority rank chips, and responsive layouts (5-up on desktop, full width on mobile).
4. Nightmare settings live in their own panel with a large, touch friendly stepper, live slot unlocks, and reminders about the next node that will open.
5. The Optimize Arbor button runs a backtracking search that ignores unowned heroes, honors node unlock levels, and only activates after every hero has been classified and the lineup is full.
6. The Summon Simulator handles Warrior, monthly Rate-Up, weekly Rate-Up, and Xenoscape banners with configurable pity counters (40-pull mythic and 30-pull xeno), resource tracking, and persistent histories for each banner.

### Summon Simulator Overview
- **Warrior Summon** – Pick one wishlist hero per element (Fire/Ice/Wind/Electro) and simulate pulls with the 2.5% wishlist rate, 5.5% Legendary rate, 27% Epic rate, and 65% Common rate. Scrolls are consumed first; if you run out, the sim optionally burns 290 gems per pull.
- **Rate-Up** – Configure the monthly featured hero and the current weekly hero. Mythic pulls roll at 3.11% with a 40-pull pity that resets after each mythic and splits 50/50 between the featured hero and the DS/ID/Pharaoh/SM/BA/NB/Robot/IQ pool. Multi-pulls automatically continue counting down the pity meter.
- **Xenoscape** – Choose the active Xeno hero (Void Witch, Starlight Weaver, or Peace Keeper). All rewards follow the live drop table (Xeno hero, 30k gems, mythic hero, shards, Xenoscape hammer, etc.) with a 30-pull pity that always grants the wishlist hero.
- **History & Resources** – Every banner stores its own timeline and summary counts, so you can see how many featured mythics, Legendaries, Epics, commons, and items you rolled across multiple sessions. Scroll counts and gem pools live in `localStorage`, and you can clear a single banner’s history without touching the others.

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
1. Start on the **Akashic Arbor** tab. Visit the Hero Collection section and set each dropdown to the proper star level or Not Owned. The summary and navigation badges display how many entries still need attention.
2. Use the role, element, rarity, ownership, and search chips to narrow down the list. All filters and hero levels persist automatically.
3. Add owned heroes to the lineup. Each slot shows element/role badges, star icons, and rank priority chips (1-5). Clearing a slot also resets its rank.
4. Enter your current nightmare level. Slot counts for every node update according to this table: Fire (0/24/48), Ice (8/32/56), Electro (11/35/59), Wind (14/38/62), Fighter (17/41/65), Mage (20/44/68), Ranger (23/47/71), Support (26/50/74), Xeno (29/53/77). Hover the Available Node list to see which slot unlocks next.
5. Optimize once the lineup is full and every hero is tracked. A full-screen overlay shows real-time status phrases, a progress bar, and detailed results with lineup buff summaries plus role/element breakdowns.
6. Switch to the **Summon Simulator** tab when you want to experiment with Warrior, Rate-Up, or Xenoscape summons. Configure wishlists, pity counters, and resources, then run 1x or 10x pulls to populate the per-banner history.

### Hero Art
Avatar PNGs live in `public/avatars/`. Each file should be named after the hero abbreviation with punctuation removed, for example `SR.png` for Scarlet Reaper or `UnyieldingLancer.png` for Unyielding Lancer. Transparent 100x100 circles look best.

### Support This Tool
If the calculator saves you time, consider supporting its development: [Support this tool](https://www.buymeacoffee.com/sahagin). Contributions help cover maintenance and future feature work.
