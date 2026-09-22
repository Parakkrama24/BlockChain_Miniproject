# Member 1 — Evidence Registration (Upload & On-Chain Commit)

Owns the full vertical slice for registering new evidence: the contract
function that writes to the chain, the backend endpoint that calls it, and
the frontend page that triggers it. This is the "write path" of the
system.

Shared project structure (agree this with Members 2 & 3 before anyone
starts coding — see `PROJECT_GUIDE.md` §3–4):
```
blockchain/   (one shared Hardhat project — everyone commits contract code here)
backend/      (one shared Spring Boot app — everyone owns their own controller/service files)
frontend/     (Thymeleaf templates inside backend/, or a shared small React app)
```

## Deliverables

1. In `blockchain/contracts/EvidenceRegistry.sol` — the core struct,
   storage mapping, and the `registerEvidence` function + its event
   (exact code in §1)
2. Hardhat tests for registration (§2)
3. Backend: `POST /api/evidence` endpoint, `HashingService`, the
   `EvidenceMetadata` JPA entity (§3)
4. Frontend: the **Register Evidence** page (§4)

## 1. Your contract code

You own this part of `EvidenceRegistry.sol` — coordinate with Members 2
and 3 since you're all editing the same file (agree the struct/mapping
shape together in a 15-minute call before anyone writes code, then each
person adds their own function below it):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceRegistry {
    struct EvidenceRecord {
        string caseId;
        string fileName;
        bytes32 sha256Hash;
        address uploader;
        uint256 timestamp;
    }

    mapping(uint256 => EvidenceRecord) public records;
    uint256 public nextId;

    event EvidenceRegistered(
        uint256 indexed evidenceId,
        string caseId,
        bytes32 sha256Hash,
        address uploader,
        uint256 timestamp
    );

    // --- Member 1's function ---
    function registerEvidence(
        string calldata caseId,
        string calldata fileName,
        bytes32 sha256Hash
    ) external returns (uint256 evidenceId) {
        evidenceId = nextId++;
        records[evidenceId] = EvidenceRecord(
            caseId, fileName, sha256Hash, msg.sender, block.timestamp
        );
        emit EvidenceRegistered(evidenceId, caseId, sha256Hash, msg.sender, block.timestamp);
    }

    // Member 2 adds getEvidence() / verifyHash() below this
    // Member 3 adds case-indexing + access control below that
}
```

## 2. Tests you own

- Registering evidence increments `nextId` and stores the correct fields.
- The `EvidenceRegistered` event fires with the correct arguments (Hardhat
  lets you assert on emitted events — `expect(tx).to.emit(...)`).
- Registering two items for the same `caseId` produces two distinct
  `evidenceId`s.

## 3. Backend: your endpoint

`POST /api/evidence` — multipart form: `file`, `caseId`, `uploader`.

```java
@Service
public class HashingService {
    public String sha256Hex(MultipartFile file) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream is = file.getInputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}
```

Your `EvidenceController.register(...)` flow: hash the file → call
`evidenceRegistry.registerEvidence(caseId, fileName, hashBytes).send()` via
the shared `BlockchainService` (Web3j wrapper — see note in §5) → save an
`EvidenceMetadata` row → return:

```json
{
  "evidenceId": 3,
  "fileName": "evidence.pdf",
  "sha256Hash": "9f86d0...",
  "txHash": "0xabc123...",
  "uploadedAt": "2026-09-22T10:15:00Z"
}
```

You also own the `EvidenceMetadata` JPA entity (id, caseId, fileName,
storagePath, sha256Hash, uploader, uploadedAt, chainEvidenceId, txHash) and
its repository, since your endpoint is the one creating rows.

## 4. Frontend: your page

**Register Evidence** — form with case ID, uploader name, file picker.
On submit, show the returned `evidenceId`, `sha256Hash`, and `txHash`
prominently — that transaction hash on screen is what proves "this is
really on a blockchain," so don't bury it.

## 5. Shared plumbing (build together, once, on day 1)

Someone has to set up: the shared Hardhat project skeleton, `Web3jConfig`
(Web3j client bean + loaded contract instance) in the backend, and the
base Spring Boot project. Do this as a **joint 1–2 hour session with all
three members** before splitting off — it's the one piece that isn't
naturally any single person's vertical slice, and getting it wrong three
different ways wastes a day. Whoever is most comfortable with Docker/CLI
tooling drives; the other two follow along so everyone can run the whole
stack locally.

## Timeline

| When | What |
|---|---|
| Day 1 | Joint setup session (§5) with all 3 members; agree struct/mapping shape |
| Days 2–3 | Write & test `registerEvidence`, deploy locally, confirm callable from Hardhat console |
| Days 3–4 | Backend `POST /api/evidence` + `HashingService` + entity, wired to the real contract call |
| Days 5–6 | Register Evidence frontend page |
| Day 7 | Joint integration dry run with Members 2 & 3 |
