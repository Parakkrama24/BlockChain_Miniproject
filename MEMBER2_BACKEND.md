# Member 2 — Evidence Verification (Tamper Detection)

Owns the full vertical slice for verifying evidence against its on-chain
record: the contract's read/compare functions, the backend endpoint, and
the frontend verify page. This is the "read path" and the actual proof
moment of the whole demo — the hash-mismatch check lives here.

Shared project structure (see `MEMBER1_BLOCKCHAIN.md` §5 for the joint
setup session — do that together before starting your own slice):
```
blockchain/   (shared Hardhat project — you add your functions to the same EvidenceRegistry.sol)
backend/      (shared Spring Boot app — you own your own controller/service files)
frontend/     (shared Thymeleaf templates or React app)
```

## Deliverables

1. In `blockchain/contracts/EvidenceRegistry.sol` — `getEvidence` and
   `verifyHash` functions (§1), added below Member 1's `registerEvidence`
2. Hardhat tests proving hash-mismatch detection actually works (§2) —
   this is the most important test in the whole project, it's the entire
   thesis of the demo
3. Backend: `POST /api/evidence/{evidenceId}/verify` and
   `GET /api/evidence/{evidenceId}` endpoints (§3)
4. Frontend: the **Verify Evidence** page with the VERIFIED/TAMPERED
   result banner (§4)

## 1. Your contract code

Add these to the shared `EvidenceRegistry.sol`, below Member 1's
`registerEvidence`:

```solidity
    // --- Member 2's functions ---
    function getEvidence(uint256 evidenceId) external view returns (EvidenceRecord memory) {
        return records[evidenceId];
    }

    function verifyHash(uint256 evidenceId, bytes32 currentHash) external view returns (bool) {
        return records[evidenceId].sha256Hash == currentHash;
    }
```

Both are `view` functions — free to call, no gas, no transaction to wait
on, which matters for a snappy live demo (verification should feel
instant on screen).

## 2. Tests you own (the core proof of the project)

- `verifyHash` returns `true` when called with the exact original hash.
- `verifyHash` returns `false` when called with a hash from even a
  single-byte-modified file — write this test with two SHA-256 hashes
  computed from two near-identical byte arrays to prove it's not a fluke.
- `getEvidence` on a non-existent `evidenceId` returns a zeroed-out struct
  (Solidity default) — decide with Member 3 whether the backend should
  treat that as a 404, and document it.

## 3. Backend: your endpoints

`POST /api/evidence/{evidenceId}/verify` — multipart form: `file`.

Your flow: hash the uploaded file (reuse Member 1's `HashingService`) →
call `evidenceRegistry.verifyHash(evidenceId, computedHashBytes).send()`
via the shared `BlockchainService` → also fetch the stored hash via
`getEvidence` so you can show both values → return:

```json
{
  "evidenceId": 3,
  "verified": false,
  "storedHash": "9f86d0...",
  "computedHash": "3a7bd3...",
  "checkedAt": "2026-09-22T10:20:00Z"
}
```

**Important:** this endpoint must call the chain live, not just compare
against the cached DB row — that's the whole point of the demo: you're
proving against the on-chain record, not trusting your own database,
which an admin could edit. Call it out explicitly in code review with the
team.

`GET /api/evidence/{evidenceId}` — simple read of the cached
`EvidenceMetadata` row (Member 1's entity) for fast display; no chain call
needed here since it's just showing what was previously registered.

## 4. Frontend: your page

**Verify Evidence** — pick/enter an evidence ID, upload a file, submit.
Show a large, unambiguous **VERIFIED** (green) or **TAMPERED** (red)
banner with `storedHash` vs `computedHash` side by side so the mismatch is
visually obvious from the back of the room.

## Timeline

| When | What |
|---|---|
| Day 1 | Joint setup session with Members 1 & 3 (see Member 1's file §5) |
| Days 2–3 | Write & test `getEvidence`/`verifyHash`, including the hash-mismatch test |
| Days 3–4 | Backend verify + get endpoints, wired to real contract calls |
| Days 5–6 | Verify Evidence frontend page with the VERIFIED/TAMPERED banner |
| Day 7 | Joint integration dry run with Members 1 & 3 — this is the step everyone watches in the live demo, so test it more than the others |
