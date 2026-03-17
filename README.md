BOMBBUSTERS — Project Structure
=================================

FOLDER LAYOUT
-------------
BOMBBUSTERS/
├── pages/          ← All HTML files
│   ├── game.html
│   ├── home.html
│   ├── index.html
│   ├── lobby.html
│   ├── leaderboard.html
│   └── account.html
│
├── css/            ← All stylesheets
│   ├── main.css    (shared: header, nav, footer, forms)
│   └── game.css    (game board only)
│
├── js/             ← All JavaScript files
│   ├── game.js     (game logic, deck, turns, powerups)
│   ├── socket.js   (socket.io integration layer — stubs)
│   └── main.js     (shared page logic, if needed)
│
└── images/
    ├── powerups/   ← PP1.png … PP12.png
    ├── tiles/
    │   ├── white/  ← 1.png … 12.png
    │   ├── red/    ← 1.png … 12.png (future)
    │   ├── yellow/ ← 1.png … 11.png
    │   └── back.png
    ├── logo.png
    └── scales.jpg

PATH NOTES
----------
All HTML files in pages/ use:
  ../css/main.css
  ../css/game.css
  ../js/game.js
  ../js/socket.js
  ../images/logo.png
  ../images/tiles/...
  ../images/powerups/...

Inter-page links (href) use the filename only since they're in the same folder:
  href="game.html"
  href="home.html"
  etc.