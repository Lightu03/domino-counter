# Domino Pip Counter

A web app that keeps count of the pips (dots) the other players are holding.
It runs entirely in your browser: no server, and nothing is uploaded.

## How to use it
**Online game (computer):** tap **Screen**, share the game window, drag a box around the **board**, and tap **Watch**.
Everything is then automatic: tiles inside the box are counted as played, tiles outside it are read as your hand (including tiles you draw), and when one of your tiles appears on the board it is marked as your play.

**Real table (phone camera):** tap **Camera**, point it at your tiles and tap **Read my hand**, then point it at the table and tap **Watch**.

A tile must show up the same way in 3 of 4 scans in a row before it counts. Tap ✕ on a chip to undo a wrong one, or tap any tile in the grid to fix it.

## Best move
The app works out the two open ends by itself. In a line of dominoes every inner number is matched in pairs, so the open ends are the numbers that appear an odd number of times. It then ranks every legal play by:
going out, pips dumped, getting rid of doubles, keeping a follow-up, how many unseen tiles fit the new ends, which numbers you control, known passes (with *Track turns*), and whether the play blocks the game, and whether you'd win or lose the count if it does.
You can override the ends with the two drop-downs. Games with a spinner (four open ends) are not supported.

## Detection
Colour-based: works with white, black or grey tiles and black, white or coloured pips, at any angle, including tiles touching each other on the board.
Pips must sit on the standard pip positions, so text and icons on screen are ignored. Face-down tiles are not read as blanks.

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
