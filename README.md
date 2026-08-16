# ⚡ Quiz Scorer (Pounce & Bounce Controller)

A streamlined, high-speed live scoring engine designed for quizmasters running standard **Pounce & Bounce** quiz formats (8–10 teams).

---

## 🎯 Key Features

* **30-Second Pounce Window:** Single-click (or hotkey) tagging of pounce slips during a countdown timer.
* **Clockwise Bounce Engine:** Teams that pounced are automatically greyed out and locked from the bounce queue.
* **Flexible Point Splitting:** Award full points (+10) to a single team, or select 2–3 teams to split bounce points (+5 / +3.3 pts) automatically.
* **Blind Pounce Scoring:** Pounce submissions remain hidden until after the bounce round concludes. Grading (+15 / -10) occurs post-bounce to keep gameplay fair.
* **Real-Time In-Card Editing:** Rename teams and view points directly inside team tiles on the main stage.
* **Special Round Batch Scorer:** Dedicated drawer to inject arbitrary positive or negative point adjustments per team without disrupting question rotation.
* **Question History Log:** Complete retrospective log tracking direct teams, bounce awards, and individual pounce slip results per question.
* **Dual-Screen Projector Display:** Audience scoreboard route (`?display=projector`) synced via the browser's native `BroadcastChannel` API with zero external server dependencies.
* **Local Persistence:** Quiz state automatically syncs to `localStorage` to safeguard against accidental page reloads.

---

## 🕹️ Scoring Rules

| Action | Points | Behavior |
| :--- | :--- | :--- |
| **Pounce (Correct)** | `+15` | Secretly submitted during the 30s window, graded post-bounce |
| **Pounce (Incorrect)**| `-10` | Secretly submitted during the 30s window, graded post-bounce |
| **Bounce (Solo)** | `+10` | Awarded to 1 eligible non-pouncing team |
| **Bounce (Split)** | `+5` / `+3.3` | Split evenly when selecting 2 or 3 teams |
| **Bounce (Pass)** | `0` | Advances turn clockwisely or ends bounce |
| **Special Round** | `+/- X` | Custom point adjustments committed in batch |

---

## ⌨️ Keyboard Shortcuts

* **`Spacebar`**: Start 30-second timer / Pause & Resume
* **`1` – `8` (or `0`)**: Instantly toggle Pounce submission for Team 1 through 8/10

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* npm

### Installation
```bash
# Clone the repository and navigate into the folder
cd quiz-scorer

# Install dependencies
npm install

# Start the local development server
npm run dev