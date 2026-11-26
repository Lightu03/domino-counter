# Domino Pip Counter

A web app that keeps count of the pips (dots) the other players are holding.
It runs entirely in your browser: no server, and nothing is uploaded.

## How to use it
**Online game (computer):** tap **Screen**, share the game window, drag a box around the **board**, and tap **Watch**.
Everything is then automatic: tiles inside the box are counted as played, tiles outside it are read as your hand (including tiles you draw), and when one of your tiles appears on the board it is marked as your play.

**Real table (phone camera):** tap **Camera**, point it at your tiles and tap **Read my hand**, then point it at the table and tap **Watch**.

A tile must show up the same way in 3 of 4 scans in a row before it counts. Tap ✕ on a chip to undo a wrong one, or tap any tile in the grid to fix it.

## Rules it is built for
2-player **Draw dominoes**: 28 tiles (double-six), 7 each, 14 in the stock. If you can't match, you draw until you can or the stock runs out. Going out wins. If the game is blocked, the lowest count wins, and a tie refunds the stake.

## Best move
The best move is the play that gives your opponent the fewest answers and keeps you playing. It is not about dumping pips. For every legal play the app works out:
1. **Opponent can't answer → they must draw ~N tiles** (or pass when the stock is empty). This is the exact chance they hold nothing for the new ends, from every unseen tile, their tile count and the numbers they are known not to have. Each tile they are forced to draw is one more they must get rid of before they can go out.
2. **If they answer, you can still play:** every answer they could give is checked against your remaining hand.
3. **Blocked games:** the opponent first draws the whole stock, then the lowest count wins. A block is only suggested when you win the count.
4. **What strong players also weigh:** keeping variety (never giving up your last tile of a number), controlling numbers you hold many of, playing doubles before they get stuck, and shedding heavy tiles when the opponent is about to go out.
5. **Going out** always comes first.

**Reading the opponent (online games):**
- Their face-down tiles are counted, which gives their exact tile count and the stock size. This works when the backs sit side by side. Overlapping backs can't be counted, and then the app estimates.
- When their count goes up, they drew because nothing fit the ends, so they hold none of those numbers. That stays true after they play the tile they drew to answer.
- The panel shows "Opponent has no: …". Tap **clear** if it's ever wrong.

The open ends are read from the numbers on the board, or from the layout when both ends show the same number. You can override them with the two drop-downs. Spinner games (four open ends) are not supported.

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
