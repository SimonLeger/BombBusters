// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const HAND_SIZE = 14;

const CURRENT_LEVEL = 'Niveau 1';
const ACTIVE_INDICATORS = [];

// Player panel colors — change any of these to restyle a player's panel.
// Accepts any valid CSS color: hex, rgba(), hsl(), named colors, etc.
const PLAYER_COLORS = {
  top:    'rgba(40,  60, 160, 0.35)',   // Joueur 2 — blue
  left:   'rgba(140, 40,  40, 0.35)',   // Joueur 3 — red
  right:  'rgba(120, 85,  10, 0.35)',   // Joueur 4 — gold
  bottom: 'rgba(30, 100,  40, 0.45)',   // Joueur 1 (vous) — green
};

// Face-down card back used for all opponent hands
const CARD_BACK = 'images/tiles/back.png';

// Main player hand — 14 slots, uses white tile images.
// Remove entries to show placeholders for missing cards.
const MAIN_HAND = [
  { label: '1',  src: 'images/tiles/white/1.png'  },
  { label: '2',  src: 'images/tiles/white/2.png'  },
  { label: '3',  src: 'images/tiles/white/3.png'  },
  { label: '4',  src: 'images/tiles/white/4.png'  },
  { label: '5',  src: 'images/tiles/white/5.png'  },
  { label: '6',  src: 'images/tiles/white/6.png'  },
  { label: '7',  src: 'images/tiles/white/7.png'  },
  { label: '8',  src: 'images/tiles/white/8.png'  },
  { label: '9',  src: 'images/tiles/white/9.png'  },
  { label: '10', src: 'images/tiles/white/10.png' },
  { label: '11', src: 'images/tiles/white/11.png' },
  { label: '12', src: 'images/tiles/white/12.png' },
  // slots 13 and 14 will show as placeholders
];

// How many face-down cards each opponent currently holds
const TOP_HAND_COUNT   = 12;  // Joueur 2
const LEFT_HAND_COUNT  = 12;  // Joueur 3
const RIGHT_HAND_COUNT = 12;  // Joueur 4

// Power-up images — leave src empty to show a placeholder
const POWERUP_CARDS = [
  { src: '' },
  { src: '' },
  { src: '' },
  { src: '' },
  { src: '' },
];

// APPLY COLORS TO PANELS
// ─────────────────────────────────────────────────────────────────────────────

document.querySelector('.panel-top').style.background    = PLAYER_COLORS.top;
document.querySelector('.panel-left').style.background   = PLAYER_COLORS.left;
document.querySelector('.panel-right').style.background  = PLAYER_COLORS.right;
document.querySelector('.panel-bottom').style.background = PLAYER_COLORS.bottom;

// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toggleSelected(el) { el.classList.toggle('selected'); }

function makeImg(src, alt) {
  const img = document.createElement('img');
  if (src) img.src = src;
  img.alt = alt || '';
  return img;
}

function makeCard(baseClass, extraClass, src, alt, labelText) {
  const card = document.createElement('div');
  const isEmpty = !src;
  card.className = baseClass + (extraClass ? ' ' + extraClass : '') + (isEmpty ? ' card-placeholder' : '');
  if (!isEmpty) {
    card.appendChild(makeImg(src, alt));
    if (labelText) {
      const lbl = document.createElement('div');
      lbl.className = 'card-label';
      lbl.textContent = labelText;
      card.appendChild(lbl);
    }
    card.addEventListener('click', () => toggleSelected(card));
  }
  return card;
}

// LEVEL LABEL
// ─────────────────────────────────────────────────────────────────────────────

document.querySelector('.board-label').textContent = CURRENT_LEVEL;

// OPPONENT HANDS (face-down)
// ─────────────────────────────────────────────────────────────────────────────

function buildOpponentHand(cardContainerId, slotContainerId, cardClass, backClass, slotClass, filledCount) {
  const cardContainer = document.getElementById(cardContainerId);
  const slotContainer = slotContainerId ? document.getElementById(slotContainerId) : null;

  for (let i = 0; i < HAND_SIZE; i++) {
    const hasSrc = i < filledCount;
    const card = document.createElement('div');
    card.className = cardClass + ' ' + (hasSrc ? backClass : 'card-placeholder');
    if (hasSrc) {
      card.appendChild(makeImg(CARD_BACK, 'Carte face cachee'));
      card.addEventListener('click', () => toggleSelected(card));
    }
    cardContainer.appendChild(card);

    if (slotContainer) {
      const slot = document.createElement('div');
      slot.className = slotClass;
      slotContainer.appendChild(slot);
    }
  }
}

buildOpponentHand('topCards',   'topSlots',   'mini-card', 'back-p2', 'mini-slot slot-p2', TOP_HAND_COUNT);
buildOpponentHand('leftCards',  'leftSlots',  'side-card', 'back-p3', 'side-slot slot-p3', LEFT_HAND_COUNT);
buildOpponentHand('rightCards', 'rightSlots', 'side-card', 'back-p4', 'side-slot slot-p4', RIGHT_HAND_COUNT);

// PLATEAU INDICATOR CARDS
// ─────────────────────────────────────────────────────────────────────────────

const numRow = document.getElementById('numRow');

for (let i = 1; i <= 12; i++) {
  const card = document.createElement('div');
  card.className = 'num-card' + (ACTIVE_INDICATORS.includes(i) ? ' active' : '');
  card.addEventListener('click', () => card.classList.toggle('active'));

  const lbl = document.createElement('div');
  lbl.className = 'num-label';
  lbl.textContent = i;
  card.appendChild(lbl);

  numRow.appendChild(card);

  if (i < 12) {
    const group = document.createElement('div');
    group.className = 'slot-group';
    for (let s = 0; s < 2; s++) {
      const slot = document.createElement('div');
      slot.className = 'empty-slot';
      group.appendChild(slot);
    }
    numRow.appendChild(group);
  }
}

// POWER-UP CARDS
// ─────────────────────────────────────────────────────────────────────────────

const powerupZone = document.getElementById('powerupZone');

for (let i = 0; i < 5; i++) {
  const cfg = POWERUP_CARDS[i];
  const src = cfg ? cfg.src : '';
  const card = document.createElement('div');
  const isEmpty = !src;
  card.className = 'powerup-card' + (isEmpty ? ' card-placeholder' : '');

  if (!isEmpty) {
    card.appendChild(makeImg(src, 'Power-up ' + (i + 1)));
    card.addEventListener('click', () => toggleSelected(card));
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'pu-label';
    lbl.style.color = 'rgba(255,255,255,0.1)';
    lbl.textContent = '★';
    card.appendChild(lbl);
  }
  powerupZone.appendChild(card);
}

// MAIN HAND (face-up)
// ─────────────────────────────────────────────────────────────────────────────

const bottomSlots = document.getElementById('bottomSlots');
const mainCardsEl = document.getElementById('mainCards');

for (let i = 0; i < HAND_SIZE; i++) {
  const cfg = MAIN_HAND[i];
  const src = cfg ? cfg.src : '';
  const label = cfg ? cfg.label : '';

  const slot = document.createElement('div');
  slot.className = 'main-slot slot-p1';
  bottomSlots.appendChild(slot);

  const card = makeCard('main-card', null, src, label, null);
  mainCardsEl.appendChild(card);
}

// CONFIRM
// ─────────────────────────────────────────────────────────────────────────────

function confirmPlay() {
  document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
}