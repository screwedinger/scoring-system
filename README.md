# ⚡ Quiz Scorer (Pounce & Bounce Controller)

A keyboard-first, offline-capable live scoring application designed for Quizmasters running high-speed **Pounce & Bounce** quiz formats (8–10 teams).

---

## 🎯 Key Features

* **Snake-Pattern Seating Grid:** Displays teams in a natural room-loop layout (Teams 1–4 on top left-to-right, Teams 5–8 underneath right-to-left) with simple, clean `[1]`, `[2]` badges.
* **Round 1 vs. Round 2 Direction Engine:**
  * **Round 1:** Starts at **Q1**, begins with **Team 1**, and rotates direct turns **Clockwise** ($1 \rightarrow 2 \rightarrow \dots \rightarrow 8$).
  * **Round 2:** Starts at **Q1**, begins with the **Last Team**, and rotates direct turns **Anti-Clockwise** ($8 \rightarrow 7 \rightarrow \dots \rightarrow 1$).
* **30-Second Pounce Window:** Single-key tagging of secret pounce slips during an active countdown timer.
* **Blind Grading (Post-Bounce Reveal):** Pounce scores ($+15$ / $-10$) remain secret until the bounce phase concludes.
* **In-Place Editable Bounce Splits:** Select 1 team ($+10$) or 2–3 teams to split points, with direct inline inputs to customize exact points per team (e.g., $+7$ / $+3$).
* **Special Round Logging:** Dedicated drawer to batch-award custom points with custom titles logged directly to the scoring ledger.
* **History Log & CSV Export:** Complete question-by-question ledger recording direct turns, bounce splits, pounce slips, and special rounds with one-click **CSV Download**.
* **Dual-Screen Projector Sync:** Real-time audience display (`?display=projector`) synced via the browser's native `BroadcastChannel` API without external servers.
* **Local Persistence:** Quiz state automatically syncs to `localStorage` to survive accidental browser reloads.

---

## 🕹️ Scoring Rules

| Action | Points | Workflow & Rules |
| :--- | :--- | :--- |
| **Pounce (Correct)** | `+15` | Logged during 30s timer; evaluated post-bounce |
| **Pounce (Incorrect)** | `-10` | Logged during 30s timer; evaluated post-bounce |
| **Bounce (Solo)** | `+10` | Awarded to 1 eligible non-pouncing team |
| **Bounce (Split)** | `+5` / `+3.3` (Editable) | Split across 2–3 teams; exact point values can be edited manually |
| **Bounce (Pass)** | `0` | Pass all bounce turns with zero points |
| **Special Round** | `+/- X` | Custom batch point additions/deductions committed with round titles |

---

## ⌨️ Complete Keyboard Workflow

| Key | Pounce Phase | Bounce Phase | Post-Bounce Pounce Review | Question End |
| :--- | :--- | :--- | :--- | :--- |
| **`Spacebar`** | Start / Pause / Resume Timer | — | — | — |
| **`1` – `8` (or `0`)** | Toggle Pounce Slip | Select / Deselect Team | Toggle Grade (`+15` $\leftrightarrow$ `-10`) | — |
| **`Enter`** | Skip to Bounce | Confirm Bounce & Reveal | Commit Pounce Scores | Advance to Next Question |

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* npm

### Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev