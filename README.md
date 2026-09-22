# Blockchain-Based Digital Evidence Integrity System

**EC8204 — Blockchain and Cyber Security**, Group Project
University of Ruhuna, Faculty of Engineering, Dept. of Electrical &
Information Engineering. Submission deadline: **31/09/2026** (3-minute
presentation, ELMS submission).

## Problem

Digital evidence (PDFs, images, logs, forensic exports) collected for a
criminal case can be modified after collection — intentionally or through
mishandling — which undermines its integrity and admissibility. A regular
database can't prove a file hasn't changed, because whoever controls the
database can also edit any hash stored alongside it.

## Solution

On upload, the system computes a **SHA-256 hash** of the evidence file and
commits that hash — plus case ID, uploader, and timestamp — to a
blockchain. The file itself is **never** stored on-chain, only its hash.
Once committed, no single party can silently alter that record without the
mismatch becoming detectable the next time the evidence is re-verified.

**Important framing:** blockchain here proves tampering *after the fact*
— it does not *prevent* someone tampering with the original file before it
is first hashed. That's why the access-control piece (only authorized
investigators can register evidence) matters alongside the hashing itself.

## Live demo script (the 3-minute pitch)

1. Investigator uploads `evidence.pdf` under a case.
2. Backend computes its SHA-256 hash.
3. Hash + metadata is committed to the blockchain (transaction hash returned).
4. The file is modified — even a single byte.
5. System recomputes the hash of the current file.
6. System compares it against the on-chain record → reports **TAMPERED**
   (mismatch) vs **VERIFIED** (match).

## Architecture

```
┌─────────────────────┐      REST (JSON)      ┌──────────────────────────┐
│   Frontend            │ ───────────────────▶ │   Spring Boot Backend     │
│   (Thymeleaf/React)   │ ◀─────────────────── │   (evidence-service)      │
└─────────────────────┘                        │                          │
                                                │ - File upload handling   │
                                                │ - SHA-256 hashing        │
                                                │ - Evidence metadata DB   │
                                                │ - Blockchain client      │
                                                └───────────┬──────────────┘
                                                            │ Web3j (JSON-RPC)
                                                            ▼
                                                ┌──────────────────────────┐
                                                │  Local Ethereum node     │
                                                │  (Hardhat)               │
                                                │  EvidenceRegistry.sol    │
                                                └──────────────────────────┘
```

Full architecture rationale, module breakdown, and build order:
see **[PROJECT_GUIDE.md](PROJECT_GUIDE.md)**.

## Repository structure

```
.
├── README.md                    # this file
├── PROJECT_GUIDE.md              # full architecture, module breakdown, build order
├── MEMBER1_BLOCKCHAIN.md         # Member 1's task: evidence registration (write path)
├── MEMBER2_BACKEND.md            # Member 2's task: evidence verification (read/tamper-check path)
├── MEMBER3_FRONTEND_DEMO.md      # Member 3's task: case mgmt, access control, audit trail, demo
├── EC8204_Aug26_Project Description.pdf   # official assignment brief
├── blockchain/                   # Hardhat project — smart contract layer
│   ├── contracts/EvidenceRegistry.sol
│   ├── test/
│   ├── scripts/seed.js
│   ├── ignition/modules/
│   └── README.md                 # blockchain-layer setup & usage
├── backend/                       # Spring Boot project (Member 2) — not yet created
└── frontend/                      # UI (Member 3) — not yet created
```

## Team split

Each member owns a full **vertical slice** — their own smart contract
function(s) plus the backend endpoint and frontend page that use them —
rather than a horizontal frontend/backend split. This way everyone writes
real Solidity, not just one person. All three slices share the same
`blockchain/`, `backend/`, and `frontend/` folders.

| Member | Slice | Details |
|---|---|---|
| 1 | Evidence registration (write path) — `registerEvidence` | [MEMBER1_BLOCKCHAIN.md](MEMBER1_BLOCKCHAIN.md) |
| 2 | Evidence verification (tamper detection) — `getEvidence` / `verifyHash` | [MEMBER2_BACKEND.md](MEMBER2_BACKEND.md) |
| 3 | Case management, access control, audit trail + demo/presentation | [MEMBER3_FRONTEND_DEMO.md](MEMBER3_FRONTEND_DEMO.md) |

## Current status

- [x] `blockchain/` — Hardhat project set up (Hardhat 2, Solidity 0.8.28)
- [x] `EvidenceRegistry.sol` — struct, storage mapping, `registerEvidence`
      function, `EvidenceRegistered` event
- [x] Tests passing: data correctness, event emission, ID auto-incrementing
- [x] Deploys to a local chain; manually verified via Hardhat console
- [x] `npm run node` / `npm run seed` scripts for one-command local setup
      with demo data
- [ ] `getEvidence` / `verifyHash` functions (Member 2)
- [ ] Access control + case indexing (Member 3)
- [ ] `backend/` Spring Boot project
- [ ] `frontend/` UI
- [ ] Web3j integration (backend ↔ chain)
- [ ] End-to-end demo rehearsal + slide deck

## Getting started (blockchain layer)

```bash
cd blockchain
npm install
npm run node      # terminal 1 — starts local chain, leave running
npm run seed       # terminal 2 — deploys contract + registers demo evidence
```

Full details, including what happens when the local chain resets and how
to hand off the contract to the backend: see
**[blockchain/README.md](blockchain/README.md)**.

`backend/` and `frontend/` setup instructions will be added here once
those projects are scaffolded.

## Tech stack

- **Blockchain:** Solidity `^0.8.28`, Hardhat 2, ethers.js v6
- **Backend:** Java, Spring Boot, Web3j (planned)
- **Frontend:** Thymeleaf or React (planned)
- **Database:** H2 for evidence metadata cache (planned)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
