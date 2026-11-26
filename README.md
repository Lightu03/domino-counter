# Domino Pip Counter

A web app that keeps count of the pips (dots) the other players are holding.
It runs entirely in your browser: no server, and nothing is uploaded.

## How to use it (hands-free)
1. Tap **Camera** (or **Screen** on a computer playing online).
2. Point it at your tiles and tap **Read my hand**.
3. Point it at the table and tap **Watch table**. From then on every new tile that appears is counted by itself.
   A tile has to show up clearly in 3 of 4 scans in a row before it counts, so passing blur or hands don't cause wrong counts.

The big number is the pips your opponents are holding. It is exact once the boneyard is empty and a range before that.
Every added tile shows up as a chip under the buttons: tap ✕ on a chip to undo a wrong one. You can also tap any tile in the grid to fix it.

Optional: open *Players, passes & turns* and turn on **Track turns** to get a pip range for each opponent.

## Detection tips
- Light tiles with dark pips on a darker table work best. For black tiles, turn on *Black tiles* in ⚙ settings.
- Tiles can be at any angle. Tiles touching end to end in a straight line are split correctly.
- Drag a box on the video to watch only part of it. Tap once to go back to the full frame.

## Hosting on GitHub Pages
1. Create a new repository on github.com (e.g. `domino-counter`).
2. Push this folder:
   ```
   git remote add origin https://github.com/<your-username>/domino-counter.git
   git push -u origin main
   ```
3. On the repository page go to **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and click Save.
4. After about a minute the app is live at `https://<your-username>.github.io/domino-counter/`.
   Open that on your phone and choose **Add to Home Screen**.

The camera only works over HTTPS, which GitHub Pages provides.## How to use it (hands-free)
1. Tap **Camera** (or **Screen** on a computer playing online).
2. Point it at your tiles and tap **Read my hand**.
3. Point it at the table and tap **Watch table**. From then on every new tile that appears is counted by itself.
   A tile has to show up clearly in 3 of 4 scans in a row before it counts, so passing blur or hands don't cause wrong counts.

The big number is the pips your opponents are holding. It is exact once the boneyard is empty and a range before that.
Every added tile shows up as a chip under the buttons: tap ✕ on a chip to undo a wrong one. You can also tap any tile in the grid to fix it.

Optional: open *Players, passes & turns* and turn on **Track turns** to get a pip range for each opponent.

## Detection tips
- Light tiles with dark pips on a darker table work best. For black tiles, turn on *Black tiles* in ⚙ settings.
- Tiles can be at any angle. Tiles touching end to end in a straight line are split correctly.
- Drag a box on the video to watch only part of it. Tap once to go back to the full frame.

## Hosting on GitHub Pages
1. Create a new repository on github.com (e.g. `domino-counter`).
2. Push this folder:
   ```
   git remote add origin https://github.com/<your-username>/domino-counter.git
   git push -u origin main
   ```
3. On the repository page go to **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and click Save.
4. After about a minute the app is live at `https://<your-username>.github.io/domino-counter/`.
   Open that on your phone and choose **Add to Home Screen**.

The camera only works over HTTPS, which GitHub Pages provides.
