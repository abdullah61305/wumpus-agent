# Dynamic Wumpus Logic Agent (A.R.C.A. Engine)

A web-based pathfinding agent navigating the Wumpus World using Propositional Logic and Resolution Refutation. Built for AI Course Assignment 6.

## Features Built
- **Dynamic Grid Sizing**: Customizable Rows x Cols layout.
- **Dynamic Hazards**: Random distribution of Pits and Wumpus.
- **Propositional Logic KB**: Native CNF constraint mapping per cell.
- **Resolution Refutation**: Automated theorem proving engine to infer Safe Cells (`~P ^ ~W`).
- **Telemetry Dashboard**: Real-time tracking of Inference Steps and active percepts (Breeze/Stench).
- **Dark Mode UI**: Premium aesthetic with visual cell status tracking.

## Tech Stack
- Next.js (React Framework)
- Tailwind CSS (Styling)
- TypeScript (Strict typing for logic engine)

## Deployment
Live via Vercel.
