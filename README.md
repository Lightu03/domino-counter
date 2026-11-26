# Domino Pip Counter

A web app that keeps count of the pips (dots) the other players are holding.
It runs entirely in your browser: no server, and nothing is uploaded.

## How it works
Total pips in the set − pips in your hand − pips already played = pips the other players hold (plus the boneyard).

- **My hand / Played / Unmark**: tap tiles in the grid, or scan them.
- **Played by**: pick who played the tile. With "next player" on, the turn moves on by itself.
- **Pass**: pick the numbers that were open on the ends. The app then knows that player has none of them and narrows down their pip range.
- **Drew +1**: someone took a tile from the boneyard.
- When the boneyard is empty, the opponents' total is **exact**.

## Scanning
- **Camera**: point it at the table (on a phone it uses the back camera).
- **Screen**: share the window of an online domino game (computer only; phone browsers can't share the screen).
- **Photo**: take or pick a picture.

Drag a box around the tiles you want read, then press **Scan**. Check the numbers, fix any that are wrong, and press **Add**.
Light tiles with dark pips on a darker table work best. Tick **Dark tiles** for black dominoes with white pips.

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
