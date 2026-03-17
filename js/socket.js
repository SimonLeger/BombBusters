// SOCKET.IO INTEGRATION
// =============================================================================
// This file is the single place where all socket communication lives.
// game.js calls the "emit" functions below when the local player acts.
// The "on" handlers receive events from other players and call back into game.js.
//
// TO INTEGRATE:
//   1. Uncomment the socket connection line and replace the URL.
//   2. Replace each TODO comment in the emit functions with the real emit call.
//   3. Fill in each "on" handler to call the appropriate game.js function.
//
// The socket object is intentionally null until you connect — all emit calls
// are no-ops when offline so the game still works without a server.
// =============================================================================

// const socket = io('https://your-server.com');   // <-- uncomment and replace
const socket = null;

// HELPERS
// -----------------------------------------------------------------------------

function emit(event, payload) {
  if (!socket) return;   // offline / not yet connected — silently skip
  socket.emit(event, payload);
}

// =============================================================================
// OUTGOING — called by game.js when the local player does something
// =============================================================================

// Called when the player selects their indicator card at the start of the game.
// payload: { number: int, color: string }
function emitIndicatorChosen(number, color) {
  // TODO: emit('indicator_chosen', { number, color });
  console.log('[socket] emitIndicatorChosen', { number, color });
}

// Called when the player completes a full set of 4 cards.
// payload: { number: int, color: string }
function emitSetComplete(number, color) {
  // TODO: emit('set_complete', { number, color });
  console.log('[socket] emitSetComplete', { number, color });
}

// Called when the player self-defuses 2 white cards.
// payload: { number: int, color: 'white', cardsUsed: int }
function emitSelfDefuse(number, color, cardsUsed) {
  // TODO: emit('self_defuse', { number, color, cardsUsed });
  console.log('[socket] emitSelfDefuse', { number, color, cardsUsed });
}

// Called when the player self-defuses all yellow cards.
// payload: { cardsUsed: int }
function emitYellowDefuse(cardsUsed) {
  // TODO: emit('yellow_defuse', { cardsUsed });
  console.log('[socket] emitYellowDefuse', { cardsUsed });
}

// Called when the player makes a guess against an opponent card.
// payload: { targetPosition: string, targetIndex: int, ownNumber: int, ownColor: string, matched: bool }
function emitGuess(targetPosition, targetIndex, ownNumber, ownColor, matched) {
  // TODO: emit('guess', { targetPosition, targetIndex, ownNumber, ownColor, matched });
  console.log('[socket] emitGuess', { targetPosition, targetIndex, ownNumber, ownColor, matched });
}

// Called when the player uses a power-up (to be implemented later).
// payload: { powerupIndex: int, powerupType: string, target: any }
function emitPowerUp(powerupIndex, powerupType, target) {
  // TODO: emit('power_up', { powerupIndex, powerupType, target });
  console.log('[socket] emitPowerUp', { powerupIndex, powerupType, target });
}

// =============================================================================
// INCOMING — handlers for events received from other players
// =============================================================================
// Each handler calls back into game.js via the functions listed below.
// Those functions are stubs in game.js — fill them in when the server is ready.
// =============================================================================

function registerSocketHandlers() {
  if (!socket) return;

  // Another player chose their indicator card
  socket.on('indicator_chosen', (data) => {
    // data: { position: 'top'|'left'|'right', number: int, color: string }
    onOpponentIndicatorChosen(data.position, data.number, data.color);
  });

  // Another player completed a full set
  socket.on('set_complete', (data) => {
    // data: { position, number, color }
    onOpponentSetComplete(data.position, data.number, data.color);
  });

  // Another player self-defused white cards
  socket.on('self_defuse', (data) => {
    // data: { position, number, color, cardsUsed }
    onOpponentSelfDefuse(data.position, data.number, data.color, data.cardsUsed);
  });

  // Another player defused yellow cards
  socket.on('yellow_defuse', (data) => {
    // data: { position, cardsUsed }
    onOpponentYellowDefuse(data.position, data.cardsUsed);
  });

  // Another player made a guess
  socket.on('guess', (data) => {
    // data: { position, targetPosition, targetIndex, ownNumber, ownColor, matched }
    onOpponentGuess(
      data.position,
      data.targetPosition,
      data.targetIndex,
      data.ownNumber,
      data.ownColor,
      data.matched
    );
  });

  // Server tells us whose turn it is (authoritative turn advancement from server)
  socket.on('turn_advance', (data) => {
    // data: { turn: 'left'|'top'|'right'|'bottom' }
    onTurnAdvance(data.turn);
  });

  // Server broadcasts a life was lost
  socket.on('life_lost', (data) => {
    // data: { livesRemaining: int }
    onLifeLost(data.livesRemaining);
  });

  // Server says game over
  socket.on('game_over', () => {
    onGameOver();
  });

  // A power-up was used (to be implemented later)
  socket.on('power_up', (data) => {
    // data: { position, powerupIndex, powerupType, target }
    onOpponentPowerUp(data.position, data.powerupIndex, data.powerupType, data.target);
  });
}

// Call this once the socket connects
registerSocketHandlers();