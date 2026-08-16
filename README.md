# ⚡ Pounce & Bounce Quiz score

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=flat&logo=vercel)](https://scoring-system-ashen.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?style=flat&logo=github)](https://github.com/screwedinger/scoring-system)

A fast, keyboard-driven live scoring dashboard and dual-screen audience display designed specifically for the standard Indian collegiate/open **Pounce & Bounce** quiz format (8–10 teams).

Zero backend. Offline-ready. Built for live stage execution where speed and zero operator latency are critical.

---

## 🎯 What It Does

Most general-purpose scorekeeping software breaks down when handling competitive trivia formats with blind betting and multi-team pass splits. This system coordinates the entire live loop:

* **Blind Pounce Logging:** Secret pounce slips are logged during an active 30-second countdown window without revealing scores or interrupting stage momentum.
* **Automatic Bounce Queue Locking:** Teams that pounced are automatically barred from participating in the bounce pass sequence.
* **Post-Bounce Blind Evaluation:** Pounces are only graded (`+15` / `-10`) *after* the bounce question is answered, preventing unfair clues or point leaks while the question is still live.
* **Arbitrary Point Splits:** Distribute bounce points across 1 to 3 teams automatically (`+10`, `+5`, `+3.3`) or customize exact point distributions in-place (e.g., `+7` / `+3`).
* **Multi-Round Turn Engine:** Automated turn rotation handling for clockwise (Round 1, starting Team 1) and reverse anti-clockwise sequences (Round 2, starting with the last team).
* **Dual-Screen Projector Sync:** Direct audience display synchronization across detached browser windows via the native `BroadcastChannel` API—no internet connection, local servers, or WebSockets required.
* **Batch Special Rounds:** Dedicated modal to inject custom positive or negative score deltas per team (e.g., written rounds, audio/visual theme sheets) without disrupting direct question order.
* **Persistent Audit Ledger:** Full question-by-question scoring history tracking direct turns, bounce splits, pounce results, and timestamps with one-click **CSV export**.

---

## 🕹️ Scoring Structure

| Phase / Action | Base Points | Rule & Behavior |
| :--- | :--- | :--- |
| **Pounce (Correct)** | `+15` | Logged during 30s timer; evaluated post-bounce |
| **Pounce (Incorrect)** | `-10` | Logged during 30s timer; evaluated post-bounce |
| **Bounce (Solo)** | `+10` | Awarded to 1 eligible non-pouncing team |
| **Bounce (Split)** | `+5` / `+3.3` (Editable) | Split across 2–3 teams; points can be overridden manually |
| **Bounce (Pass)** | `0` | Advances the round without awarding bounce points |
| **Special Round** | `+/- X` | Custom batch point additions or deductions committed with round tags |

---

## ⌨️ Single-Key Operator Workflow

The entire scoring sequence can be operated without touching a mouse:

| Key | Pounce Phase | Bounce Phase | Post-Bounce Pounce Review | Question End |
| :--- | :--- | :--- | :--- | :--- |
| **`Space`** | Start / Pause / Resume 30s Timer | — | — | — |
| **`1` – `8` (or `0`)** | Toggle Team Pounce Slip | Toggle Team Bounce Selection | Toggle Grade (`+15` $\leftrightarrow$ `-10`) | — |
| **`Enter`** | Skip Timer $\rightarrow$ Go to Bounce | Confirm Bounce $\rightarrow$ Reveal Pounces | Commit Pounce Scores | Advance to Next Question |

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
* **State Management:** Zustand with `persist` middleware (`localStorage`)
* **Multi-Window Display Sync:** Web BroadcastChannel API (`quiz_display_channel`)
* **Icons & Animation:** `lucide-react`, `canvas-confetti`

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone [https://github.com/screwedinger/scoring-system.git](https://github.com/screwedinger/scoring-system.git)
cd scoring-system
npm install