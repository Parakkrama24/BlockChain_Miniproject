# Member 3 — Case Management, Access Control & Audit Trail

Owns the full vertical slice for organizing evidence by case, restricting
who can register evidence, and showing the on-chain audit trail: the
contract's access-control + case-indexing logic, the backend endpoints,
and the case dashboard/audit UI. Also drives the overall demo rehearsal
and presentation, since the case dashboard is what's on screen first.

Shared project structure (see `MEMBER1_BLOCKCHAIN.md` §5 for the joint
setup session — do that together before starting your own slice):
```
blockchain/   (shared Hardhat project — you add your functions/modifier to the same EvidenceRegistry.sol)
backend/      (shared Spring Boot app — you own your own controller/service files)
frontend/     (shared Thymeleaf templates or React app)
```

## Deliverables

1. In `blockchain/contracts/EvidenceRegistry.sol` — a case-index mapping +
   `getEvidenceByCase` function, and an `onlyInvestigator` access-control
   modifier applied to Member 1's `registerEvidence` (§1)
2. Hardhat tests for both case indexing and access control (§2)
3. Backend: `GET /api/cases/{caseId}/evidence` and an investigator
   registration endpoint (§3)
4. Frontend: the **Case Dashboard** page and an **Audit Trail** view of
   `EvidenceRegistered` events (§4)
5. Owns rehearsing and timing the full 6-step live demo across all three
   slices, and the presentation slide deck (§5)

## 1. Your contract code

Add these to the shared `EvidenceRegistry.sol`. This requires touching
`registerEvidence` itself (Member 1's function) to add the modifier —
coordinate that one-line change with them directly rather than editing it
without telling them:

```solidity
    // --- Member 3's additions ---
    mapping(string => uint256[]) private caseEvidenceIds;
    mapping(address => bool) public isInvestigator;
    address public admin;

    constructor() {
        admin = msg.sender;
        isInvestigator[msg.sender] = true; // deployer is an investigator by default (dev convenience)
    }

    modifier onlyInvestigator() {
        require(isInvestigator[msg.sender], "Not an authorized investigator");
        _;
    }

    function addInvestigator(address account) external {
        require(msg.sender == admin, "Only admin");
        isInvestigator[account] = true;
    }

    function getEvidenceByCase(string calldata caseId) external view returns (uint256[] memory) {
        return caseEvidenceIds[caseId];
    }
```

Then, in Member 1's `registerEvidence`, two small additions (talk to them
before editing their function):
1. Add `onlyInvestigator` to the function signature.
2. Add `caseEvidenceIds[caseId].push(evidenceId);` right after storing the
   record.

## 2. Tests you own

- A non-investigator address calling `registerEvidence` reverts with
  "Not an authorized investigator".
- `admin` can call `addInvestigator` to authorize a new address, and that
  address can then successfully register evidence.
- `getEvidenceByCase` returns the correct list of evidence IDs after
  multiple registrations under the same `caseId`, and an empty array for
  an unknown case.

## 3. Backend: your endpoints

`GET /api/cases/{caseId}/evidence` — calls `getEvidenceByCase` on-chain to
get the ID list, then either calls `getEvidence` for each (simplest) or
reads the cached `EvidenceMetadata` rows filtered by `caseId` (faster —
prefer this, since Member 1's entity already stores `caseId`). Response:
array of the evidence-summary shape from Member 1's register endpoint.

You'll also want a small admin/investigator endpoint (e.g.
`POST /api/investigators`) wrapping `addInvestigator`, so the demo can show
"only registered investigators can submit evidence" as a concept, even if
you only ever call it once during setup.

**Audit trail:** use Web3j's event-filter API to fetch past
`EvidenceRegistered` events (`evidenceRegistry.evidenceRegisteredEventFlowable(...)`
or a one-off `getLogs` filter) and expose them via
`GET /api/audit-trail` — a simple list of who registered what evidence,
when, straight from the chain's event log rather than your database. This
is a nice concrete artifact for the "immutable audit trail" claim in the
presentation.

## 4. Frontend: your pages

- **Case Dashboard** — list of cases, each showing its evidence items
  (calls `GET /api/cases/{caseId}/evidence`). This is the first screen
  shown in the demo.
- **Audit Trail** — a simple table of on-chain `EvidenceRegistered` events
  (who, what case, when, tx hash) — optional but strong supporting
  evidence for the "tamper-evident, not just tamper-detected-on-request"
  framing.

## 5. Demo & presentation (you drive this, pulling in Members 1 & 2's
pieces)

Rehearse this exact sequence, timed under 3 minutes total including talk:

1. Show the case dashboard with pre-seeded evidence (register 2–3 items
   ahead of time — don't do first registration live, too slow).
2. Register **one** new piece of evidence live using Member 1's page —
   point at the returned hash and tx hash.
3. Modify the file by one character, re-upload it under Member 2's
   **Verify** page using the same evidence ID.
4. Point at the **TAMPERED** result, stored vs computed hash side by side.
5. One sentence on the caveat: detects tampering after the fact, doesn't
   prevent pre-hash tampering — which is exactly why the access-control
   modifier from this file matters (only authorized investigators can
   register evidence in the first place).

Slide order: problem → solution (hash-on-chain, not file-on-chain) →
architecture diagram (`PROJECT_GUIDE.md` §3) → live demo → caveat + next
steps. Check the exact required file naming in the project brief
(`GP_XX_Task_name in short_name.ppt`).

## Timeline

| When | What |
|---|---|
| Day 1 | Joint setup session with Members 1 & 2 (see Member 1's file §5) |
| Days 2–3 | Write & test case-indexing + access control, coordinate the `registerEvidence` modifier change with Member 1 |
| Days 3–4 | Backend case-listing + investigator + audit-trail endpoints |
| Days 5–6 | Case Dashboard + Audit Trail frontend pages, seed demo data |
| Day 7 | Full dry run with all three slices integrated, timed; finalize slide deck |
