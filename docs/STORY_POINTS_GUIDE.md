# 📐 Story Points Estimation Guide

> “Estimates should guide conversations, not become contracts.” – Agile proverb

This document explains **how the VAI-VEX team sizes work using Story Points** and provides concrete, real-world examples pulled straight from this repository’s git history.  Our goal is to help new contributors (human or AI) quickly develop an intuition for effort sizing so that planning discussions stay fast and productive.

---

## 🎲 Why Fibonacci?

We use the Fibonacci series **1, 2, 3, 5, 8, 13** because gaps widen as the numbers grow.  That forces us to think in orders of magnitude instead of false precision:

| Points | Intended scope | Typical change profile |
| :----: | -------------- | ---------------------- |
| **1** | Trivial tweak / typo fix | ≤ 1 file, < 5 LOC changed |
| **2** | Small bug fix or cosmetic tweak | 1–2 files, < 20 LOC |
| **3** | Small self-contained feature or refactor | 2–4 files, < 100 LOC |
| **5** | Medium feature touching both UI & backend **OR** new component with tests | 5–15 files, few hundred LOC |
| **8** | Large cross-cutting feature or multi-phase refactor | 10–30 files, ~1k LOC |
| **13**| Epic / multi-week project spanning many areas | Dozens of files, several K LOC |

> ⚠️ **If a ticket feels larger than 13 points – break it down.**

---

## 📏 How to Assign Points

1. **Start Small** – If your team is new to Story Points, try them on a single sprint first.
2. **Resist Hour Conversion** – Stakeholders may ask for *hours*. Point to team **velocity** instead; it reveals delivery trends over time.
3. **Break Down the Big Stuff** – Anything estimated at 13+ is probably too broad. Split into bite-sized tickets.

---

## 🧭 Real-World Examples from this Repo

| Points | Example Change (click hash to view diff) | High-level Summary |
| :----: | ---------------------------------------- | ------------------ |
| **1** | [`edc6451`](https://github.com/joinvai/vai-vex/commit/edc6451) | Fix relative Convex import path – *1 file, +1/-1 LOC* |
| **2** | [`e2726f4`](https://github.com/joinvai/vai-vex/commit/e2726f4) | Replace `<img>` with Next.js `<Image>` – *2 files, +8/-2 LOC* |
| **3** | [`54368a2`](https://github.com/joinvai/vai-vex/commit/54368a2) | Stripe auth subject fix – *3 files, +9/-3 LOC* |
| **5** | [`605ede1`](https://github.com/joinvai/vai-vex/commit/605ede1) | Comment management system merge – *~750 LOC across 13 files* |
| **8** | [`5433e58`](https://github.com/joinvai/vai-vex/commit/5433e58) | Payments Phase 4 UI components – *~920 LOC across 13 files* |
| **13**| [`35b6131`](https://github.com/joinvai/vai-vex/commit/35b6131) | Payments Phase 6 admin suite & tests – *~6,300 LOC across 41 files* |

These examples are meant to calibrate your gut feel.  When in doubt, **compare your proposed change to a similar historical one**.

---

## 🤖 AI Agents & Story Points

We actively leverage AI coding agents inside this repo.  Empirically:

* **1–5 point tickets** → *High confidence* the agent can deliver end-to-end.
* **8+ point tickets**    → Humans should lead; agents can assist with subtasks.

Treat this as guidance, not a rule – always consider complexity, not just size.

---

Happy estimating! 🎉 