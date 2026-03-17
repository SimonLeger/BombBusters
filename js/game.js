// CONFIGURATION
// -----------------------------------------------------------------------------

const HAND_SIZE = 14;

const CURRENT_LEVEL = 'Level 1';
const ACTIVE_INDICATORS = [];

// GAME PHASE
// -----------------------------------------------------------------------------
// 'indicate' = player must reveal one card as indicator before play starts
// 'play'     = normal game play
let gamePhase = 'indicate';

// LIVES
// -----------------------------------------------------------------------------
let lives = 4;
const MAX_LIVES = 5;

// ACTIVE POWERUP STATE
// -----------------------------------------------------------------------------
// Tracks which powerup (if any) is currently armed for use this turn.
// Only one powerup can be armed at a time.
// 'during-turn' powerups arm when USE is clicked and fire on Confirm.
// 'off-turn' powerups arm when USE is clicked and take effect immediately.

let armedPowerupIdx = null;  // index into activePowerups, or null

// Powerup categories:
// 'auto'        — fires immediately on unlock (PP6, PPY)
// 'during-turn' — armed before your guess, consumed on Confirm (PP10 multi-value, PP5 super-defuse)
// 'off-turn'    — used when not your turn, places something on your deck slots (PP1 tag≠, PP12 tag=, PP4 bonus indicator)
// 'anytime'     — can be used at any time during a round (PP2 trade, PP3 triple search, PP7 fresh batteries, PP8 bat detector)
// 'your-turn'   — must be used on your own turn (PP9 freeze guess, PP11 turn skip)
const POWERUP_TIMING = {
  1:   'off-turn',    // Tag ≠
  2:   'anytime',     // Trade
  3:   'anytime',     // Triple search
  4:   'anytime',     // Bonus indicator
  5:   'during-turn', // Super defuse
  6:   'auto',        // Retardator — extra life on unlock
  7:   'anytime',     // Fresh Batteries
  8:   'your-turn',   // Bat detector
  9:   'your-turn',   // Freeze guess
  10:  'during-turn', // Multi-value guess
  11:  'your-turn',   // Turn skip
  12:  'off-turn',    // Tag =
  'Y': 'auto',        // PPY — draw 2 extra powerups on unlock
};

// TURN SYSTEM
// -----------------------------------------------------------------------------
// Turn order rotates clockwise: left -> top -> right -> bottom (you)
// Mapped to panel positions. 'bottom' = your turn.
// This order applies to both the indicate phase and the play phase.

const TURN_ORDER = ['bottom', 'left', 'top', 'right'];  // green starts, then clockwise: green -> red -> blue -> orange
let currentTurnIndex = 0;

function currentTurn() {
  return TURN_ORDER[currentTurnIndex];
}

function isMyTurn() {
  return currentTurn() === 'bottom';
}

function advanceTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % TURN_ORDER.length;
  renderTurnStatus();
}

function getPlayerColor(position) {
  // Returns a CSS color string suitable for coloring the player name in the status bar
  const solid = {
    top:    assignedColors.top.border,
    left:   assignedColors.left.border,
    right:  assignedColors.right.border,
    bottom: '#6ddb85',
  };
  return solid[position] || 'white';
}

function getPlayerName(position) {
  if (position === 'bottom') return 'You';
  return PLAYER_NAMES[position];
}

function renderTurnStatus() {
  const el = document.getElementById('turnStatus');
  if (!el) return;

  const turn = currentTurn();

  if (isMyTurn()) {
    const phase = gamePhase === 'indicate'
      ? 'Choose a card to indicate — it cannot be yellow or red'
      : 'Your turn — defuse the correct cards';
    el.innerHTML = phase;
    el.className = 'turn-status turn-status--yours';
    el.style.boxShadow = `inset 0 0 1.5vw 0.3vw rgba(100,200,120,0.45)`;
    el.style.borderColor = 'rgba(100,200,120,0.5)';
    // Hide the old indicator banner — turn-status takes over messaging
    document.getElementById('indicatorBanner').style.display = 'none';
  } else {
    const name  = getPlayerName(turn);
    const color = getPlayerColor(turn);
    const phase = gamePhase === 'indicate' ? 'indicating their card...' : 'choosing...';
    el.innerHTML = `Waiting for teammates &mdash; <span style="color:${color};font-weight:900;">${name}</span> is currently ${phase}`;
    el.className = 'turn-status turn-status--waiting';
    el.style.boxShadow = '';
    el.style.borderColor = 'rgba(0,0,0,0.15)';
  }
}

// PLAYER COLOR RANDOMIZER
// -----------------------------------------------------------------------------
// Each opponent is assigned a random color from this palette.
// Your own panel (bottom) is always green.
// In the future, replace randomizePlayers() with an HTTP response.

const COLOR_PALETTE = [
  { name: 'Red',    bg: 'rgba(160, 40,  40, 0.45)', border: 'rgba(255,100,100,0.9)' },
  { name: 'Blue',   bg: 'rgba(40,  60, 160, 0.45)', border: 'rgba(100,140,255,0.9)' },
  { name: 'Orange', bg: 'rgba(180, 90,  10, 0.45)', border: 'rgba(255,160, 50,0.9)' },
];

// Green is always you (bottom) — opponents get the 3 colors above

function randomizePlayers() {
  // Shuffle the 3 opponent colors and assign to top/left/right
  const shuffled = [...COLOR_PALETTE].sort(() => Math.random() - 0.5);
  return {
    top:   shuffled[0],
    left:  shuffled[1],
    right: shuffled[2],
  };
}

const assignedColors = randomizePlayers();

// Player display names — derived from assigned colors
const PLAYER_NAMES = {
  top:   assignedColors.top.name,
  left:  assignedColors.left.name,
  right: assignedColors.right.name,
};

const PLAYER_COLORS = {
  top:    assignedColors.top.bg,
  left:   assignedColors.left.bg,
  right:  assignedColors.right.bg,
  bottom: 'rgba(30, 100, 40, 0.45)',   // you — always green
};

const PLAYER_BORDERS = {
  top:   assignedColors.top.border,
  left:  assignedColors.left.border,
  right: assignedColors.right.border,
};

const CARD_BACK = '../images/tiles/back.png';

const TOP_HAND_COUNT   = 0;  // set after shuffle
const LEFT_HAND_COUNT  = 0;
const RIGHT_HAND_COUNT = 0;

// POWERUP SYSTEM
// -----------------------------------------------------------------------------
// Each powerup has an associated unlock number (PPX unlocks when number X is
// defused >= 2 times). You always start with 4 powerups dealt randomly from
// the 12 available. One specific powerup (the "draw" powerup) lets you draw
// 2 additional powerups when unlocked.
//
// States: 'locked' | 'unlocked' | 'used'
//
// In the future this config will come from the server via HTTP/socket.

const ALL_POWERUPS = [
  { id: 1,  unlockNumber: 1,  src: '../images/powerups/PP1.png',  state: 'locked' },
  { id: 2,  unlockNumber: 2,  src: '../images/powerups/PP2.png',  state: 'locked' },
  { id: 3,  unlockNumber: 3,  src: '../images/powerups/PP3.png',  state: 'locked' },
  { id: 4,  unlockNumber: 4,  src: '../images/powerups/PP4.png',  state: 'locked' },
  { id: 5,  unlockNumber: 5,  src: '../images/powerups/PP5.png',  state: 'locked' },
  { id: 6,  unlockNumber: 6,  src: '../images/powerups/PP6.png',  state: 'locked' },
  { id: 7,  unlockNumber: 7,  src: '../images/powerups/PP7.png',  state: 'locked' },
  { id: 8,  unlockNumber: 8,  src: '../images/powerups/PP8.png',  state: 'locked' },
  { id: 9,  unlockNumber: 9,  src: '../images/powerups/PP9.png',  state: 'locked' },
  { id: 10, unlockNumber: 10, src: '../images/powerups/PP10.png', state: 'locked' },
  { id: 11, unlockNumber: 11, src: '../images/powerups/PP11.png', state: 'locked' },
  { id: 12, unlockNumber: 12, src: '../images/powerups/PP12.png', state: 'locked' },
  // PPY — "draw 2 extra powerups" — unlocks when both yellow cards have been defused.
  // unlockNumber: 'yellow' is handled specially in checkPowerupUnlocks.
  { id: 'Y', unlockNumber: 'yellow', src: '../images/powerups/PPY.png', state: 'locked', isDrawPowerup: true },
];

const DRAW_POWERUP_ID = 'Y';

// Deal 4 powerups at game start:
//   - Pick 4 at random from the eligible pool.
//   - PPY is only eligible if yellows are in play this game.
//   - Dealt powerups are then sorted in ascending order (1-12, Y last)
//     so they always display left-to-right like the number cards.
function dealPowerups() {
  const hasYellows = (typeof YELLOW_NUMBERS !== 'undefined') && YELLOW_NUMBERS.length > 0;

  // Build eligible pool: PP1-PP12 always eligible, PPY only if yellows exist
  const pool = ALL_POWERUPS.filter(p => p.id !== 'Y' || hasYellows);

  // Pick 4 at random
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 4);

  // Sort ascending: numeric ids first (1-12), then Y
  picked.sort((a, b) => {
    if (a.id === 'Y') return 1;
    if (b.id === 'Y') return -1;
    return a.id - b.id;
  });

  return picked;
}

// activePowerups is initialized after the deck is dealt (YELLOW_NUMBERS must exist first)
let activePowerups = [];

// Check if any powerup should unlock after a defuse.
// Called after every successful defuse — pass the defused number.
// Also call with 'yellow' after a yellow self-defuse.
function checkPowerupUnlocks(defusedNumber) {
  activePowerups.forEach((pu, idx) => {
    if (!pu || pu.state !== 'locked') return;

    if (pu.unlockNumber === 'yellow') {
      // PPY unlocks when BOTH yellow cards have been defused (spent or revealed)
      const yellowsLeft = countAllOwnCards('yellow')
        + countAllOpponentCards('yellow');
      if (yellowsLeft === 0) {
        activePowerups[idx] = { ...pu, state: 'unlocked' };
        renderPowerupSlot(idx);
        if (POWERUP_TIMING[pu.id] === 'auto') {
          activatePowerupEffect(idx);
        }
      }
    } else {
      const defusedCount = countDefusedNumber(pu.unlockNumber);
      if (defusedCount >= 2) {
        activePowerups[idx] = { ...pu, state: 'unlocked' };
        renderPowerupSlot(idx);
        // Auto-fire powerups activate immediately on unlock
        if (POWERUP_TIMING[pu.id] === 'auto') {
          activatePowerupEffect(idx);
        }
      }
    }
  });
}

// Count all unspent face-down opponent cards of a given color
function countAllOpponentCards(color) {
  let count = 0;
  document.querySelectorAll('.mini-card:not(.revealed):not(.card-placeholder), .side-card:not(.revealed):not(.card-placeholder)').forEach(card => {
    if (card.dataset.color === color) count++;
  });
  return count;
}

// Count how many of a given number have been defused (spent own + revealed opponent)
function countDefusedNumber(number) {
  return countSpentOwnCards(String(number), 'white')
       + countRevealedOpponentCards(String(number), 'white');
}

// Arm a powerup (non-auto) — called when player clicks USE button
function armPowerup(idx) {
  const pu = activePowerups[idx];
  if (!pu || pu.state !== 'unlocked') return;
  if (POWERUP_TIMING[pu.id] === 'auto') return;  // auto powerups don't need arming

  // Only 1 powerup can be armed at a time
  // Mutual exclusion: PP5 and PP10 can't both be armed (both are 'during-turn' guessing modifiers)
  if (armedPowerupIdx !== null) {
    cancelPowerup();
  }

  armedPowerupIdx = idx;
  activePowerups[idx] = { ...pu, state: 'armed' };
  renderPowerupSlot(idx);
  updatePowerupButtons();

  // Off-turn and anytime powerups activate immediately when armed
  // (during-turn ones wait for Confirm; your-turn ones also wait)
  const timing = POWERUP_TIMING[pu.id];
  if (timing === 'anytime' || (timing === 'off-turn' && !isMyTurn()) ||
      (timing === 'your-turn' && isMyTurn())) {
    activatePowerupEffect(idx);
  }
}

// Cancel an armed powerup
function cancelPowerup() {
  if (armedPowerupIdx === null) return;
  const pu = activePowerups[armedPowerupIdx];
  if (pu) {
    activePowerups[armedPowerupIdx] = { ...pu, state: 'unlocked' };
    renderPowerupSlot(armedPowerupIdx);
  }
  armedPowerupIdx = null;
  updatePowerupButtons();
}

// Activate the actual effect of a powerup at idx
function activatePowerupEffect(idx) {
  const pu = activePowerups[idx];
  if (!pu) return;

  switch (pu.id) {
    case 6:    // Retardator — gain an extra life (max 5)
      if (lives < MAX_LIVES) {
        lives++;
        const heart = document.getElementById('heart-' + (lives - 1));
        if (heart) heart.classList.remove('lost');
      }
      markPowerupUsed(idx);
      break;

    case 'Y':  // PPY — mark used first, then draw (sort happens inside drawExtraPowerups)
      markPowerupUsed(idx);
      drawExtraPowerups();
      break;

    case 11:   // Turn skip — skip your turn
      markPowerupUsed(idx);
      armedPowerupIdx = null;
      updatePowerupButtons();
      advanceTurn();
      autoSkipOpponentPlayTurns();
      break;

    // During-turn powerups: effect applied in confirmPlay when guess is made
    case 5:    // Super defuse — TODO: implement in confirmPlay
    case 10:   // Multi-value guess — TODO: implement in confirmPlay
      // stays 'armed' until confirm
      break;

    // Other powerups — stubs
    case 1:    // Tag ≠
    case 2:    // Trade
    case 3:    // Triple search
    case 4:    // Bonus indicator
    case 7:    // Fresh Batteries
    case 8:    // Bat detector
    case 9:    // Freeze guess
    case 12:   // Tag =
      console.log('[powerup] PP' + pu.id + ' activated — TODO: implement effect');
      markPowerupUsed(idx);
      armedPowerupIdx = null;
      updatePowerupButtons();
      break;
  }
}

// Called by the USE button — arms the first unlocked powerup found
function puUseClicked() {
  // If one is already armed, do nothing (CANCEL first)
  if (armedPowerupIdx !== null) return;
  const idx = activePowerups.findIndex(p => p && p.state === 'unlocked');
  if (idx !== -1) armPowerup(idx);
}

function markPowerupUsed(idx) {
  const pu = activePowerups[idx];
  if (!pu) return;
  activePowerups[idx] = { ...pu, state: 'used' };
  renderPowerupSlot(idx);
}

// Update the USE/CANCEL button states based on armedPowerupIdx
function updatePowerupButtons() {
  const useBtn    = document.getElementById('pu-use-btn');
  const cancelBtn = document.getElementById('pu-cancel-btn');
  if (!useBtn || !cancelBtn) return;

  const hasArmed = armedPowerupIdx !== null;
  const hasUnlocked = activePowerups.some(p => p && p.state === 'unlocked');

  useBtn.disabled    = !hasUnlocked && !hasArmed;
  cancelBtn.disabled = !hasArmed;
  useBtn.style.opacity    = (hasUnlocked && !hasArmed) ? '1' : '0.4';
  cancelBtn.style.opacity = hasArmed ? '1' : '0.4';
}

// Draw 2 extra powerups into the empty slots (slots 4 and 5)
function drawExtraPowerups() {
  const activeIds = activePowerups.filter(p => p).map(p => p.id);
  const available = ALL_POWERUPS.filter(p => !activeIds.includes(p.id));
  const drawn = available.sort(() => Math.random() - 0.5).slice(0, 2);

  // Fill empty slots with the drawn powerups
  let filled = 0;
  for (let i = 0; i < activePowerups.length && filled < drawn.length; i++) {
    if (activePowerups[i] === null) {
      activePowerups[i] = { ...drawn[filled], state: 'locked' };
      filled++;
    }
  }

  // Re-sort all slots: numeric ids ascending (1-12), Y last, nulls at the end
  activePowerups.sort((a, b) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (a.id === 'Y') return 1;
    if (b.id === 'Y') return -1;
    return a.id - b.id;
  });

  // Re-render all slots in the new order
  for (let i = 0; i < activePowerups.length; i++) {
    renderPowerupSlot(i);
  }
}

// Render a single powerup slot based on activePowerups[idx]
function renderPowerupSlot(idx) {
  const zone  = document.getElementById('powerupZone');
  const cards = zone.querySelectorAll('.powerup-card');
  const card  = cards[idx];
  if (!card) return;

  const pu = activePowerups[idx];

  if (!pu) {
    // Empty slot
    card.className = 'powerup-card card-placeholder';
    card.innerHTML = '<div class="pu-label" style="color:rgba(255,255,255,0.1)">★</div>';
    card.onclick = null;
    return;
  }

  const img = card.querySelector('img') || document.createElement('img');
  img.src = pu.src;
  img.alt = 'PP' + pu.id;
  img.style.width  = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';

  if (pu.state === 'locked') {
    card.className = 'powerup-card powerup-locked';
    card.innerHTML = '';
    card.appendChild(img);
    card.onclick = null;
  } else if (pu.state === 'unlocked') {
    card.className = 'powerup-card powerup-unlocked';
    card.innerHTML = '';
    card.appendChild(img);
    card.onclick = () => armPowerup(idx);
  } else if (pu.state === 'armed') {
    card.className = 'powerup-card powerup-armed';
    card.innerHTML = '';
    card.appendChild(img);
    card.onclick = () => cancelPowerup();
  } else if (pu.state === 'used') {
    card.className = 'powerup-card powerup-used';
    card.innerHTML = '';
    card.appendChild(img);
    card.onclick = null;
  }
}

// Placeholder — replaced by real POWERUP_CARDS loop below
const POWERUP_CARDS = activePowerups;

// DECK BUILDER
// -----------------------------------------------------------------------------
// Full deck: 4 of each number 1-12 in white, red, yellow (48 white+red + 2 yellow = 50)
// Actually: 4×12 = 48 cards total. We add 2 yellow variants on top → 50 cards.
// Distribution: 2 players get 12 cards, 2 players get 13 cards (random who gets which).

function buildDeck() {
  const deck = [];

  // 4 white of each number 1-12 (48 cards) + 2 yellow = 50 total
  for (let n = 1; n <= 12; n++) {
    for (let i = 0; i < 4; i++) deck.push({ number: n, color: 'white' });
  }

  // 2 bonus yellow cards — pick 2 distinct random numbers
  const yellowNums = [];
  while (yellowNums.length < 2) {
    const n = Math.floor(Math.random() * 11) + 1;  // max 11 — no yellow 12
    if (!yellowNums.includes(n)) yellowNums.push(n);
  }
  yellowNums.forEach(n => deck.push({ number: n, color: 'yellow' }));

  // Store for plateau slot display
  deck._yellowNums = yellowNums;

  // Shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;  // 50 cards
}

function dealHands(deck) {
  // Randomly assign hand sizes: 2 players get 12, 2 players get 13
  // Total: 12+12+13+13 = 50 — uses the whole deck
  const sizes = [12, 12, 13, 13];
  // Shuffle sizes to randomise who gets which
  for (let i = sizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }

  let cursor = 0;
  return sizes.map(size => {
    const hand = deck.slice(cursor, cursor + size);
    cursor += size;
    // Sort hand by number asc, then color
    hand.sort((a, b) => a.number !== b.number
      ? a.number - b.number
      : a.color.localeCompare(b.color));
    return hand;
  });
}

const COLOR_FOLDERS = {
  white:  '../images/tiles/white',
  red:    '../images/tiles/red',
  yellow: '../images/tiles/yellow',
};

function cardSrc(number, color) {
  const folder = COLOR_FOLDERS[color] || COLOR_FOLDERS.white;
  return `${folder}/${number}.png`;
}

// SELECTION STATE
// -----------------------------------------------------------------------------
// Rules:
//   - At most 1 opponent card selected at a time (from any opponent panel)
//   - For your own hand: either 1 card OR up to 4 cards all sharing the same number
//   - You cannot mix "set of 4" with an opponent card selection simultaneously

let selectedOpponent = null;   // the currently selected opponent card element
let selectedOwn = [];          // array of selected own-hand card elements

function clearOpponentSelection() {
  if (selectedOpponent) {
    selectedOpponent.classList.remove('selected');
    selectedOpponent = null;
  }
}

function clearOwnSelection() {
  selectedOwn.forEach(c => c.classList.remove('selected'));
  selectedOwn = [];
}

function handleOpponentCardClick(card) {
  if (!isMyTurn()) return;
  // Opponent cards cannot be selected during indicate phase
  if (gamePhase === 'indicate') return;

  // Deselect if already selected
  if (selectedOpponent === card) {
    clearOpponentSelection();
    return;
  }
  // Replace any previous opponent selection
  clearOpponentSelection();
  selectedOpponent = card;
  card.classList.add('selected');
}

function handleOwnCardClick(card, number) {
  if (!isMyTurn()) return;
  // Spent cards cannot be interacted with
  if (card.dataset.spent === 'true') return;

  // During indicate phase: only 1 own card, no opponent, no yellow
  if (gamePhase === 'indicate') {
    if (card.dataset.color === 'yellow') return;  // yellow not allowed as indicator
    const alreadySelected = card.classList.contains('selected');
    clearOwnSelection();
    clearOpponentSelection();
    if (!alreadySelected) {
      selectedOwn = [card];
      card.classList.add('selected');
    }
    return;
  }

  const alreadySelected = card.classList.contains('selected');

  if (alreadySelected) {
    // Deselect this card
    card.classList.remove('selected');
    selectedOwn = selectedOwn.filter(c => c !== card);
    return;
  }

  // If an opponent is also selected, only allow picking 1 own card
  if (selectedOpponent) {
    // Clear any multi-select and pick just this one
    clearOwnSelection();
    selectedOwn = [card];
    card.classList.add('selected');
    return;
  }

  // No opponent selected — allow set-of-4 rule
  if (selectedOwn.length === 0) {
    // First card — just select it
    selectedOwn = [card];
    card.classList.add('selected');
    return;
  }

  const activeColor = selectedOwn[0].dataset.color;

  // YELLOW special rule: yellows can be grouped together regardless of number.
  // If we already have yellows selected, only add more yellows (up to 4).
  // If we have non-yellows selected and click a yellow, replace selection.
  if (card.dataset.color === 'yellow') {
    if (activeColor !== 'yellow') {
      // Switch from non-yellow selection to yellow
      clearOwnSelection();
      selectedOwn = [card];
      card.classList.add('selected');
      return;
    }
    // Add to yellow selection (up to 4)
    if (selectedOwn.length < 4) {
      selectedOwn.push(card);
      card.classList.add('selected');
    }
    return;
  }

  // If we already have yellows selected and click a non-yellow, replace selection
  if (activeColor === 'yellow') {
    clearOwnSelection();
    selectedOwn = [card];
    card.classList.add('selected');
    return;
  }

  // Non-yellow: check that all currently selected own cards share the same number
  const activeNumber = selectedOwn[0].dataset.number;
  if (String(number) !== activeNumber) {
    // Different number — replace selection with this card only
    clearOwnSelection();
    selectedOwn = [card];
    card.classList.add('selected');
    return;
  }

  // Same number — allow up to 4
  if (selectedOwn.length < 4) {
    selectedOwn.push(card);
    card.classList.add('selected');
  }
  // If already 4 selected, do nothing
}

// APPLY COLORS TO PANELS
// -----------------------------------------------------------------------------

document.querySelector('.panel-top').style.background       = PLAYER_COLORS.top;
document.querySelector('.panel-top').style.borderColor      = PLAYER_BORDERS.top;
document.querySelector('.panel-left').style.background      = PLAYER_COLORS.left;
document.querySelector('.panel-left').style.borderColor     = PLAYER_BORDERS.left;
document.querySelector('.panel-right').style.background     = PLAYER_COLORS.right;
document.querySelector('.panel-right').style.borderColor    = PLAYER_BORDERS.right;
document.querySelector('.panel-bottom').style.background    = PLAYER_COLORS.bottom;
document.querySelector('.panel-bottom').style.borderColor   = 'rgba(100,200,120,0.4)';

// Render the initial turn status
renderTurnStatus();

// HELPERS
// -----------------------------------------------------------------------------

function makeImg(src, alt) {
  const img = document.createElement('img');
  if (src) img.src = src;
  img.alt = alt || '';
  return img;
}

// LEVEL LABEL
// -----------------------------------------------------------------------------

document.getElementById('boardLabel').textContent = CURRENT_LEVEL;

// BUILD & DEAL
// -----------------------------------------------------------------------------

const deck = buildDeck();
const [hand1, hand2, hand3, hand4] = dealHands(deck);
// hand1 = bottom (you), hand2 = top, hand3 = left, hand4 = right

// Numbers that have yellow cards in play (max 11, always 2 distinct numbers)
const YELLOW_NUMBERS = deck._yellowNums || [];

// Now that YELLOW_NUMBERS is known, deal powerups (PPY only included if yellows exist)
activePowerups = [
  ...dealPowerups(),
  null,  // slot 5 — empty until drawn
  null,  // slot 6 — empty until drawn
];
// RED_NUMBERS: empty for now, add when red cards are introduced
const RED_NUMBERS = [];

// OPPONENT HANDS (face-down)
// -----------------------------------------------------------------------------

// Build top hand (horizontal — separate card row and pu slot row)
function buildTopHand(cardContainerId, slotContainerId, puSlotContainerId, backClass, slotClass, hand) {
  const cardContainer   = document.getElementById(cardContainerId);
  const slotContainer   = document.getElementById(slotContainerId);
  const puSlotContainer = document.getElementById(puSlotContainerId);

  for (let i = 0; i < HAND_SIZE; i++) {
    const filled = i < hand.length;
    const card = document.createElement('div');
    card.className = 'mini-card ' + (filled ? backClass : 'card-placeholder');
    if (filled) {
      const d = hand[i];
      card.dataset.number = d.number;
      card.dataset.color  = d.color;
      card.dataset.index  = i;
      card.appendChild(makeImg(CARD_BACK, 'face cachee'));
      card.addEventListener('click', () => handleOpponentCardClick(card));
    }
    cardContainer.appendChild(card);

    const slot = document.createElement('div');
    slot.className = slotClass;
    slotContainer.appendChild(slot);

    if (i < HAND_SIZE - 1) {
      const puSlot = document.createElement('div');
      puSlot.className = 'mini-slot-pu';
      puSlotContainer.appendChild(puSlot);
    }
  }
}

// Build side hand (vertical — separate columns for cards, value slots, pu slots)
function buildSideHand(cardContainerId, slotContainerId, puSlotContainerId, backClass, slotClass, hand) {
  const cardContainer   = document.getElementById(cardContainerId);
  const slotContainer   = document.getElementById(slotContainerId);
  const puSlotContainer = puSlotContainerId ? document.getElementById(puSlotContainerId) : null;

  for (let i = 0; i < HAND_SIZE; i++) {
    const filled = i < hand.length;
    const card = document.createElement('div');
    card.className = 'side-card ' + (filled ? backClass : 'card-placeholder');
    if (filled) {
      const d = hand[i];
      card.dataset.number = d.number;
      card.dataset.color  = d.color;
      card.dataset.index  = i;
      card.appendChild(makeImg(CARD_BACK, 'face cachee'));
      card.addEventListener('click', () => handleOpponentCardClick(card));
    }
    cardContainer.appendChild(card);

    const slot = document.createElement('div');
    slot.className = slotClass;
    slotContainer.appendChild(slot);

    // 13 pu slots — one between each adjacent pair of cards (not after the last)
    if (puSlotContainer && i < HAND_SIZE - 1) {
      const puSlot = document.createElement('div');
      puSlot.className = 'side-slot-pu';
      puSlotContainer.appendChild(puSlot);
    }
  }
}

buildTopHand('topCards', 'topSlots', 'topSlotspu', 'back-p2', 'mini-slot slot-p2', hand2);
buildSideHand('leftCards',  'leftSlots',  'leftSlotspu',  'back-p3', 'side-slot slot-p3', hand3);
buildSideHand('rightCards', 'rightSlots', 'rightSlotspu', 'back-p4', 'side-slot slot-p4', hand4);

// PLATEAU INDICATOR CARDS
// -----------------------------------------------------------------------------
// plateauCards[n] holds the indicator card element for number n (1-12).

const numRow = document.getElementById('numRow');
const plateauCards = {};  // keyed by number 1-12

for (let i = 1; i <= 12; i++) {
  const card = document.createElement('div');
  card.className = 'num-card';
  card.dataset.plateauNum = i;

  const lbl = document.createElement('div');
  lbl.className = 'num-label';
  lbl.textContent = i;
  card.appendChild(lbl);
  numRow.appendChild(card);
  plateauCards[i] = card;

  if (i < 12) {
    const group = document.createElement('div');
    group.className = 'slot-group';

    // Top slot = yellow indicator
    const slotYellow = document.createElement('div');
    slotYellow.className = 'empty-slot plateau-slot-yellow';
    if (YELLOW_NUMBERS.includes(i)) slotYellow.classList.add('plateau-slot-has-yellow');
    group.appendChild(slotYellow);

    // Bottom slot = red indicator
    const slotRed = document.createElement('div');
    slotRed.className = 'empty-slot plateau-slot-red';
    if (RED_NUMBERS.includes(i)) slotRed.classList.add('plateau-slot-has-red');
    group.appendChild(slotRed);

    numRow.appendChild(group);
  }
}

// POWER-UP CARDS
// -----------------------------------------------------------------------------

// Build 6 powerup card elements then render each from activePowerups state
const powerupZone = document.getElementById('powerupZone');

for (let i = 0; i < 6; i++) {
  const card = document.createElement('div');
  card.className = 'powerup-card card-placeholder';
  const lbl = document.createElement('div');
  lbl.className = 'pu-label';
  lbl.style.color = 'rgba(255,255,255,0.1)';
  lbl.textContent = '★';
  card.appendChild(lbl);
  powerupZone.appendChild(card);
  renderPowerupSlot(i);   // immediately replace with real state
  if (i === 5) updatePowerupButtons();  // update buttons after all slots rendered
}

// MAIN HAND (face-up, with selection logic)
// -----------------------------------------------------------------------------

const bottomSlots = document.getElementById('bottomSlots');
const mainCardsEl = document.getElementById('mainCards');

const bottomSlotsPu = document.getElementById('bottomSlotspu');

for (let i = 0; i < HAND_SIZE; i++) {
  const slot = document.createElement('div');
  slot.className = 'main-slot slot-p1';
  bottomSlots.appendChild(slot);

  const data = hand1[i];
  const card = document.createElement('div');

  if (data) {
    const src = cardSrc(data.number, data.color);
    card.className = 'main-card';
    card.dataset.number = data.number;
    card.dataset.color  = data.color;
    card.appendChild(makeImg(src, `${data.number} ${data.color}`));
    card.addEventListener('click', () => handleOwnCardClick(card, data.number));
  } else {
    card.className = 'main-card card-placeholder';
  }

  mainCardsEl.appendChild(card);

  // PU slot sits BETWEEN adjacent cards — add after every card except the last
  if (i < HAND_SIZE - 1) {
    const puSlot = document.createElement('div');
    puSlot.className = 'main-slot-pu';
    bottomSlotsPu.appendChild(puSlot);
  }
}

// MATCH CHECK
// -----------------------------------------------------------------------------
// Replace the body of checkMatch() when your API is ready.
// It receives the selected own cards and the selected opponent card,
// and should return true if the play is valid, false otherwise.
//
// Current stub: a match is valid when the opponent card's number equals
// the number of the selected own card(s).

async function checkMatch(ownCards, opponentCard) {
  // --- STUB: replace this block with your HTTP request ---
  // Match rules:
  //   - yellow vs yellow: always matches regardless of number
  //   - anything else: number AND color must both match
  const ownNumber = parseInt(ownCards[0].dataset.number);
  const ownColor  = ownCards[0].dataset.color;
  const oppNumber = parseInt(opponentCard.dataset.number);
  const oppColor  = opponentCard.dataset.color;
  if (ownColor === 'yellow' && oppColor === 'yellow') return true;
  return ownNumber === oppNumber && ownColor === oppColor;
  // -------------------------------------------------------

  // Future API call example:
  // const response = await fetch('/api/check-match', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     ownCards:     ownCards.map(c => ({ number: c.dataset.number, color: c.dataset.color })),
  //     opponentCard: { number: opponentCard.dataset.number, color: opponentCard.dataset.color },
  //   }),
  // });
  // const data = await response.json();
  // return data.match === true;
}

// SPEND A CARD (used in a correct guess — can no longer be played)
// -----------------------------------------------------------------------------

function spendCard(card) {
  card.classList.add('spent');
  card.dataset.spent = 'true';
  // Remove the existing click listener by cloning, then re-attach a no-op guard
  const fresh = card.cloneNode(true);
  card.parentNode.replaceChild(fresh, card);
  // spent cards are completely non-interactive — no listener added back
}

// Reveal an opponent card — swap back.png for the card's face image
function revealOpponentCard(card) {
  const number = card.dataset.number;
  const color  = card.dataset.color;
  const img    = card.querySelector('img');
  if (img) {
    img.src = cardSrc(number, color);
    img.alt = `${number} ${color}`;
  }
  card.classList.add('revealed');
  // Remove click handler so revealed cards can't be re-selected
  card.replaceWith(card.cloneNode(true));
}

// CONFIRM
// -----------------------------------------------------------------------------

// LIVES & OVERLAY SYSTEM
// -----------------------------------------------------------------------------

function loseLife(opponentCard, ownCards) {
  if (lives <= 0) return;
  lives--;
  const heart = document.getElementById('heart-' + lives);
  if (heart) heart.classList.add('lost');

  if (lives === 0) {
    showGameOver();
  } else {
    showWrong(opponentCard, ownCards);
  }
}

function getOpponentName(opponentCard) {
  if (opponentCard.closest('#topCards'))   return PLAYER_NAMES.top;
  if (opponentCard.closest('#leftCards'))  return PLAYER_NAMES.left;
  if (opponentCard.closest('#rightCards')) return PLAYER_NAMES.right;
  return 'Unknown';
}

function showWrong(opponentCard, ownCards) {
  const overlay = document.getElementById('centerOverlay');

  const playerName  = getOpponentName(opponentCard);
  const cardValue   = ownCards[0].dataset.number;
  const cardColor   = ownCards[0].dataset.color;
  const colorLabel  = cardColor === 'yellow' ? 'yellow' : cardColor === 'red' ? 'red' : 'white';

  const msg = `Wrong! ${playerName} doesn't have a ${colorLabel} ${cardValue} there`;

  overlay.innerHTML = `<div class="overlay-text">${msg}</div>`;
  overlay.classList.add('show-wrong');
  overlay.classList.remove('show-gameover');
  setTimeout(() => {
    overlay.classList.remove('show-wrong');
    overlay.innerHTML = '';
  }, 4000);
}

function showGameOver() {
  // Use the table-level overlay so it covers the entire game area
  const overlay = document.getElementById('tableOverlay');
  overlay.innerHTML = '<div class="overlay-text">Game Over</div>';
  overlay.classList.add('show-gameover');
  // Disable all interaction
  gamePhase = 'gameover';
}

// INDICATOR SLOT REVEAL
// -----------------------------------------------------------------------------
// Finds the indicator slot that corresponds to the selected card's position
// in the bottom hand and fills it with the card's number.

function revealIndicatorSlot(card) {
  // Find the card's index in the main hand row
  const cards = Array.from(document.getElementById('mainCards').children);
  const idx = cards.indexOf(card);
  if (idx === -1) return;

  // Get the matching slot at the same index
  const slots = Array.from(document.getElementById('bottomSlots').children);
  const slot = slots[idx];
  if (!slot) return;

  slot.classList.add('indicator-filled');
  slot.textContent = card.dataset.number;
}

// AUTO-SKIP opponent indicate turns in local simulation.
// When socket.io is active, opponents will emit their own indicate events
// and onOpponentIndicatorChosen() will call advanceTurn() instead.
function autoSkipOpponentIndicates() {
  while (gamePhase === 'indicate' && !isMyTurn()) {
    const wasLast = currentTurnIndex === TURN_ORDER.length - 1;
    advanceTurn();
    if (wasLast) {
      gamePhase = 'play';
      renderTurnStatus();
      break;
    }
  }
}

// AUTO-SKIP opponent play turns in local simulation.
// Remove when socket.io handles opponent turns server-side.
function autoSkipOpponentPlayTurns() {
  // Skip through opponents until it's our turn again
  while (gamePhase === 'play' && !isMyTurn()) {
    advanceTurn();
  }
}

async function confirmPlay() {
  if (gamePhase === 'gameover') return;
  if (!isMyTurn()) return;   // can't act on other players' turns

  // INDICATE PHASE — must select exactly 1 non-yellow own card
  if (gamePhase === 'indicate') {
    if (selectedOwn.length !== 1) return;
    const card = selectedOwn[0];

    revealIndicatorSlot(card);
    emitIndicatorChosen(card.dataset.number, card.dataset.color);

    clearOwnSelection();

    // Check BEFORE advancing whether this completes the full indicate rotation.
    // currentTurnIndex wraps back to 0 after all 4 players have gone.
    // Since bottom=0, left=1, top=2, right=3: after right (index 3) advances, index becomes 0 again.
    const wasLast = currentTurnIndex === TURN_ORDER.length - 1;
    advanceTurn();

    if (wasLast) {
      gamePhase = 'play';
      renderTurnStatus();
    } else {
      // LOCAL SIMULATION: auto-advance through opponent indicate turns
      // until it's our turn again or all have indicated.
      // Remove this block when the socket system handles opponent turns.
      autoSkipOpponentIndicates();
    }
    return;
  }

  // PLAY PHASE

  // Nothing selected at all — clear and bail
  if (selectedOwn.length === 0) {
    clearOwnSelection();
    clearOpponentSelection();
    return;
  }

  const ownNumber = selectedOwn[0].dataset.number;
  const ownColor  = selectedOwn[0].dataset.color;

  // CASE 1: 4 own cards selected, no opponent needed — "completing a set"
  // All 4 of the same number/color are in hand and selected together.
  if (selectedOwn.length === 4 && !selectedOpponent) {
    selectedOwn.forEach(card => spendCard(card));
    checkPlateauGreen(ownNumber);
  checkPowerupUnlocks(parseInt(ownNumber));
    emitSetComplete(ownNumber, ownColor);
    clearOwnSelection();
    clearOpponentSelection();
    advanceTurn();
    autoSkipOpponentPlayTurns();
    return;
  }

  // CASE 1b: Yellow self-defuse — hold ALL remaining yellow cards (2 or 4).
  // Yellows always come in pairs, so you need every unspent yellow in your hand.
  // No opponent card needed.
  if (!selectedOpponent && ownColor === 'yellow') {
    const totalYellowInHand = countAllOwnCards('yellow');      // unspent yellows you have
    const selectedYellow    = selectedOwn.length;
    // You must have selected ALL of the yellows you still hold
    if (selectedYellow === totalYellowInHand && (selectedYellow === 2 || selectedYellow === 4)) {
      selectedOwn.forEach(card => spendCard(card));
      checkClearColorSlots('yellow');
      checkPowerupUnlocks('yellow');
      emitYellowDefuse(selectedYellow);
      clearOwnSelection();
      clearOpponentSelection();
      advanceTurn();
      autoSkipOpponentPlayTurns();
      return;
    }
    clearOwnSelection();
    clearOpponentSelection();
    return;
  }

  // CASE 2: Self-defusing — 2 own white cards of the same number,
  // provided the other 2 copies of that number are accounted for:
  // spent in your own hand OR revealed on an opponent's board.
  if (selectedOwn.length === 2 && !selectedOpponent && ownColor === 'white') {
    const revealedOpponent = countRevealedOpponentCards(ownNumber, ownColor);
    const spentOwn         = countSpentOwnCards(ownNumber, ownColor);
    if (revealedOpponent + spentOwn >= 2) {
      selectedOwn.forEach(card => spendCard(card));
      checkPlateauGreen(ownNumber);
  checkPowerupUnlocks(parseInt(ownNumber));
      emitSelfDefuse(ownNumber, ownColor, selectedOwn.length);
      clearOwnSelection();
      clearOpponentSelection();
      advanceTurn();
      autoSkipOpponentPlayTurns();
      return;
    }
    // Not enough accounted for — can't self-defuse yet
    clearOwnSelection();
    clearOpponentSelection();
    return;
  }

  // CASE 3: Normal guess — 1 own card + 1 opponent card
  if (!selectedOpponent) {
    clearOwnSelection();
    clearOpponentSelection();
    return;
  }

  // Consume any armed during-turn powerup when the guess is made
  const duringTurnPu = armedPowerupIdx !== null && activePowerups[armedPowerupIdx]
    ? activePowerups[armedPowerupIdx]
    : null;
  if (duringTurnPu && POWERUP_TIMING[duringTurnPu.id] === 'during-turn') {
    activatePowerupEffect(armedPowerupIdx);
    armedPowerupIdx = null;
    updatePowerupButtons();
  }

  const matched = await checkMatch(selectedOwn, selectedOpponent);

  // Determine opponent position for socket emit
  const oppPosition = selectedOpponent.closest('#topCards')   ? 'top'
                    : selectedOpponent.closest('#leftCards')  ? 'left'
                    : selectedOpponent.closest('#rightCards') ? 'right' : null;
  const oppIndex = parseInt(selectedOpponent.dataset.index);

  if (matched) {
    revealOpponentCard(selectedOpponent);
    selectedOwn.forEach(card => spendCard(card));
    checkPlateauGreen(ownNumber);
  checkPowerupUnlocks(parseInt(ownNumber));
    checkClearColorSlots(ownColor);
  } else {
    // Wrong guess — place an indicator and lose a life
    placeWrongGuessIndicator(selectedOpponent);
    loseLife(selectedOpponent, selectedOwn);
  }

  emitGuess(oppPosition, oppIndex, ownNumber, ownColor, matched);

  clearOwnSelection();
  clearOpponentSelection();
  advanceTurn();
  autoSkipOpponentPlayTurns();
}

// Count opponent cards with a given number+color that are already revealed
function countRevealedOpponentCards(number, color) {
  let count = 0;
  document.querySelectorAll('.mini-card.revealed, .side-card.revealed').forEach(card => {
    if (card.dataset.number === String(number) && card.dataset.color === color) count++;
  });
  return count;
}

// Check if all 4 white cards of a number are accounted for (spent or revealed)
// and if so, turn that plateau card green.
function checkPlateauGreen(number) {
  const card = plateauCards[number];
  if (!card || card.classList.contains('active')) return;

  const revealed = countRevealedOpponentCards(String(number), 'white');
  const spent    = countSpentOwnCards(String(number), 'white');
  if (revealed + spent >= 4) {
    card.classList.add('active');
  }
}

// Check if all cards of a color are resolved (spent or revealed).
// If so, remove the plateau slot indicators for that color.
function checkClearColorSlots(color) {
  // Count total cards of this color still active across ALL hands
  // Own hand: unspent cards of this color
  const ownActive = countAllOwnCards(color);

  // Opponent hands: face-down (not yet revealed) cards of this color
  let oppActive = 0;
  document.querySelectorAll('.mini-card:not(.revealed):not(.card-placeholder), .side-card:not(.revealed):not(.card-placeholder)').forEach(card => {
    if (card.dataset.color === color) oppActive++;
  });

  // If nothing left active, remove the indicators for this color
  if (ownActive + oppActive === 0) {
    const slotClass = color === 'yellow' ? 'plateau-slot-has-yellow' : 'plateau-slot-has-red';
    document.querySelectorAll('.' + slotClass).forEach(slot => {
      slot.classList.remove(slotClass);
    });
  }
}

// Count ALL unspent cards of a given color in your own hand (any number)
function countAllOwnCards(color) {
  let count = 0;
  document.querySelectorAll('#mainCards .main-card:not(.spent):not(.card-placeholder)').forEach(card => {
    if (card.dataset.color === color) count++;
  });
  return count;
}

// Place a wrong-guess indicator on the slot that corresponds to the opponent card
function placeWrongGuessIndicator(opponentCard) {
  const index = parseInt(opponentCard.dataset.index);
  const isTop   = opponentCard.closest('#topCards')   !== null;
  const isLeft  = opponentCard.closest('#leftCards')  !== null;
  const isRight = opponentCard.closest('#rightCards') !== null;

  let slotContainerId = null;
  if (isTop)   slotContainerId = 'topSlots';
  if (isLeft)  slotContainerId = 'leftSlots';
  if (isRight) slotContainerId = 'rightSlots';
  if (!slotContainerId) return;

  const slots = Array.from(document.getElementById(slotContainerId).children);
  const slot  = slots[index];
  if (!slot) return;

  const isYellow = opponentCard.dataset.color === 'yellow';
  slot.classList.add('indicator-wrong');
  if (isYellow) {
    slot.classList.add('indicator-wrong-yellow');
  } else {
    slot.textContent = opponentCard.dataset.number;
  }
}

// Count your own hand cards with a given number+color that are already spent
function countSpentOwnCards(number, color) {
  let count = 0;
  document.querySelectorAll('#mainCards .main-card.spent').forEach(card => {
    if (card.dataset.number === String(number) && card.dataset.color === color) count++;
  });
  return count;
}


// SOCKET INCOMING HANDLERS (stubs — filled in when server is ready)
// =============================================================================
// These are called by socket.js when events arrive from other players.
// Replace the console.log lines with real UI updates.

function onOpponentIndicatorChosen(position, number, color) {
  // TODO: visually fill the indicator slot on the opponent's panel
  // TODO: advance turn to next player
  console.log('[game] opponent indicated', position, number, color);
  advanceTurn();
}

function onOpponentSetComplete(position, number, color) {
  // TODO: grey out / remove the 4 cards in the opponent's hand visually
  console.log('[game] opponent completed set', position, number, color);
  checkPlateauGreen(number);
  advanceTurn();
}

function onOpponentSelfDefuse(position, number, color, cardsUsed) {
  // TODO: update opponent hand visual
  console.log('[game] opponent self-defused', position, number, color, cardsUsed);
  checkPlateauGreen(number);
  advanceTurn();
}

function onOpponentYellowDefuse(position, cardsUsed) {
  // TODO: update opponent hand visual
  console.log('[game] opponent yellow-defused', position, cardsUsed);
  checkClearColorSlots('yellow');
  advanceTurn();
}

function onOpponentGuess(position, targetPosition, targetIndex, ownNumber, ownColor, matched) {
  console.log('[game] opponent guessed', position, targetPosition, targetIndex, matched);
  if (matched) {
    // TODO: reveal the card at targetPosition[targetIndex] visually
    checkPlateauGreen(ownNumber);
  checkPowerupUnlocks(parseInt(ownNumber));
    checkClearColorSlots(ownColor);
  } else {
    // TODO: place wrong-guess indicator on that slot
  }
  advanceTurn();
}

function onTurnAdvance(turn) {
  // Server overrides local turn tracking (use when server is authoritative)
  const idx = TURN_ORDER.indexOf(turn);
  if (idx !== -1) {
    currentTurnIndex = idx;
    renderTurnStatus();
  }
}

function onLifeLost(livesRemaining) {
  // Sync life count from server
  while (lives > livesRemaining) {
    lives--;
    const heart = document.getElementById('heart-' + lives);
    if (heart) heart.classList.add('lost');
  }
  if (lives === 0) showGameOver();
}

function onGameOver() {
  showGameOver();
}

function onOpponentPowerUp(position, powerupIndex, powerupType, target) {
  // TODO: implement when power-ups are designed
  console.log('[game] opponent used power-up', position, powerupIndex, powerupType, target);
}