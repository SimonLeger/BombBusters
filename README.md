# 💣 Bomb Busters — Multiplayer Web Game

A digital adaptation of the Bomb Busters board game. 2–4 players, cooperative, turn-based.

## 🎮 How to Play

### Objective
Work together as a team to flip all non-bomb tiles without running out of lives.

### Lives
- Lives = number of players (4 players = 4 lives, lose on 4th error)

### On Your Turn
1. **Look at your own hand** — you can always see your own tile values
2. **Pick one of your tiles** by clicking it (its value is called out)
3. **Pick a teammate** and click one of their hidden tiles (by position)
4. Their tile flips:
   - ✅ **Correct** — tile revealed, game continues
   - ❌ **Wrong number** — lose a life
   - ⚠️ **Yellow (danger)** — lose a life, tile revealed
   - 💥 **Bomb** — immediate game over

### Number Tracker (sidebar)
- Shows numbers 1–12
- **Green** = all 4 copies found
- **⚠️** markers = possible danger tile location
- **💣** markers = possible bomb location

### Bomb Disarm
If a player's only remaining hidden tiles are bombs, they are **automatically disarmed** (free reveal)!

### Levels
| Level | Bombs | Danger Tiles |
|-------|-------|--------------|
| 1     | 0     | 0            |
| 2     | 0     | 2            |
| 3     | 1     | 0            |
| 4     | 2     | 2 (3 possible locations per bomb) |

---