# Evidence Registry — Blockchain Layer

Smart contract layer for the Blockchain-Based Digital Evidence Integrity
System (EC8204 group project). Stores only **SHA-256 hashes** of evidence
files on-chain — never the files themselves — so any later modification to
a file can be detected by recomputing its hash and comparing it against
the on-chain record.

## Stack

- **Hardhat 2** (`^2.29.1`) — local Ethereum development environment
- **Solidity `^0.8.28`**
- **ethers.js v6** (via `@nomicfoundation/hardhat-toolbox`) — used in tests, scripts, and the console

## Project structure

```
blockchain/
├── contracts/
│   └── EvidenceRegistry.sol      # the smart contract
├── test/
│   └── EvidenceRegistry.js       # automated tests (Mocha + Chai)
├── scripts/
│   └── seed.js                   # deploys the contract + registers demo evidence
├── ignition/modules/
│   └── EvidenceRegistry.js       # Hardhat Ignition deployment module
└── hardhat.config.js
```

## Contract overview (`EvidenceRegistry.sol`)

| Function | What it does |
|---|---|
| `registerEvidence(caseId, fileName, sha256Hash)` | Stores a new evidence record, returns its `evidenceId`, emits `EvidenceRegistered` |
| `records(evidenceId)` | Auto-generated getter (from `public` mapping) — reads back a stored record |
| `nextId` | Auto-incrementing counter used to assign unique evidence IDs |

## One-time setup

```bash
npm install
```

## Running tests

```bash
npx hardhat test
```

Currently covers: correct data storage, `EvidenceRegistered` event emission
with correct arguments, and ID auto-incrementing across multiple
registrations.

## Running a local blockchain (for backend integration / demo)

**Important:** `npx hardhat node` runs an **in-memory** blockchain — closing
that terminal (or restarting your PC) wipes all deployed contracts and
data. There is no persistence to disk. This is expected for local
development; see "Every time you restart" below for the fix.

**Terminal 1** — start the local chain and leave it running:

```bash
npm run node
```

This starts a JSON-RPC node at `http://127.0.0.1:8545` and prints 20 funded
test accounts (address + private key) — this is what the Java backend
(Member 2) connects to via Web3j, and what one of those private keys is
used for as the backend's signing account.

**Terminal 2** — deploy the contract and seed it with demo evidence:

```bash
npm run seed
```

This deploys a fresh `EvidenceRegistry` and registers 3 demo evidence
items across 2 cases. It prints the **deployed contract address** — copy
that to whoever's configuring the backend or the live demo.

### Every time you restart your machine / close the node terminal

The chain resets completely. Just repeat both steps above (`npm run node`,
then `npm run seed`) to get a fresh, populated chain again. Because
Hardhat's default test accounts are deterministic, redeploying from a
fresh chain typically produces the **same contract address** as before —
but don't rely on that; always re-check the address `npm run seed` prints.

## Manually interacting with a deployed contract

With `npm run node` running in one terminal, open a console attached to it:

```bash
npx hardhat console --network localhost
```

```javascript
const EvidenceRegistry = await ethers.getContractFactory("EvidenceRegistry");
const contract = await EvidenceRegistry.attach("<deployed address>");
await contract.records(0);   // read back a stored record
```

## Handoff to the backend (Member 2)

Member 2's Spring Boot backend needs, once this is stable:

1. **The deployed contract address** — printed by `npm run seed`.
2. **The compiled ABI** — `artifacts/contracts/EvidenceRegistry.sol/EvidenceRegistry.json`
   (used to generate the Web3j Java wrapper class).
3. **A funded account's private key** — printed when `npm run node` starts
   (any of the 20 listed accounts; these are well-known Hardhat dev keys,
   safe only on a local chain, never use them anywhere real).

## Known limitations (by design, for this project's scope)

- Local Hardhat chain only — not deployed to a public testnet.
- No upgradability / proxy pattern.
- Access control (restricting who can call `registerEvidence`) is a
  separate slice of the project, not yet part of this contract.
