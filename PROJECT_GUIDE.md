# Blockchain-Based Digital Evidence Integrity System

EC8204 — Blockchain and Cyber Security, Group Project (University of Ruhuna)

## 1. Problem & Solution

Digital evidence (PDFs, images, logs, forensic exports) can be altered after
collection — intentionally or by mishandling — which breaks its admissibility
in a criminal case. A regular database cannot prove *when* a file was
recorded or *that* it hasn't changed since, because whoever controls the
database can also edit the hash alongside the file.

**Solution:** never store the evidence itself on-chain. Instead, on upload,
compute a SHA-256 hash of the file and commit that hash — plus case ID,
uploader, and timestamp — to a blockchain. Once committed, no single party
(not even a system admin) can silently alter that record without the
mismatch becoming detectable on re-verification.

This matches the "Decentralized File Integrity Verification" sample idea in
the project brief, specialised to a chain-of-custody / criminal-case
scenario — distinct enough from a generic file-hashing group project.

**Important framing for the presentation:** blockchain proves tampering
*after the fact* (detection), it does not *prevent* someone tampering with
the original file before it is first hashed. Chain-of-custody access
control on the upload step still matters — call this out explicitly, it's
the kind of nuance that impresses graders in a 3-minute pitch.

## 2. Demo Script (maps directly to your 6 steps)

1. Investigator logs in, uploads `evidence.pdf` under Case #2024-CR-045.
2. Backend computes SHA-256 hash of the file.
3. Hash + metadata (case ID, filename, uploader, timestamp) is submitted as
   a transaction to the blockchain network; transaction hash returned.
4. Attacker (or you, for the demo) modifies `evidence.pdf` — even a single
   byte — and re-uploads it via the "Verify" flow.
5. System recomputes SHA-256 of the *current* file.
6. System looks up the original hash on-chain for that evidence ID, compares
   the two, and reports **TAMPERED** (hash mismatch) vs **VERIFIED** (match).

Keep this exact sequence on screen during the live demo — it's the whole
value proposition in under a minute.

## 3. Architecture

```
┌─────────────────────┐      REST (JSON)      ┌──────────────────────────┐
│   React/Thymeleaf    │ ───────────────────▶ │   Spring Boot Backend     │
│   Frontend           │ ◀─────────────────── │   (evidence-service)      │
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
                                                │  (Hardhat / Ganache)     │
                                                │  EvidenceRegistry.sol    │
                                                └──────────────────────────┘
```

- **Blockchain layer**: a single Solidity smart contract deployed to a local
  dev chain (Hardhat or Ganache). Spring Boot never talks to it directly
  over raw JSON-RPC — it goes through **Web3j**, which also generates a
  type-safe Java wrapper class from the contract ABI.
- **Backend (Spring Boot)**: owns file upload, hashing, storing evidence
  *metadata* (not the file's hash — that lives only on-chain) in a
  relational DB for fast listing/search, and orchestrating chain reads/writes
  via Web3j.
- **File storage**: the actual PDFs/images are stored on local disk (or S3
  if you want to look fancier) — blockchain never sees file bytes, only the
  hash. This is the point to hammer home in the presentation: **on-chain
  footprint stays tiny regardless of evidence file size.**
- **Frontend**: whatever's fastest for you — plain Thymeleaf templates
  bundled in the Spring Boot app avoid standing up a second project, or a
  small React app if you want a snappier demo UI. Given the 3-minute time
  limit, Thymeleaf is the lower-risk choice.

## 4. Module Breakdown

### 4.1 Smart Contract (`EvidenceRegistry.sol`)

```solidity
struct EvidenceRecord {
    string caseId;
    string fileName;
    bytes32 sha256Hash;
    address uploader;
    uint256 timestamp;
}

mapping(uint256 => EvidenceRecord) public records;   // evidenceId -> record
uint256 public nextId;

event EvidenceRegistered(uint256 indexed evidenceId, string caseId, bytes32 sha256Hash, address uploader, uint256 timestamp);

function registerEvidence(string calldata caseId, string calldata fileName, bytes32 sha256Hash) external returns (uint256);
function getEvidence(uint256 evidenceId) external view returns (EvidenceRecord memory);
function verifyHash(uint256 evidenceId, bytes32 currentHash) external view returns (bool matches);
```

Keep it deliberately small — no upgradability, no access-control roles
beyond maybe an `onlyRegistered` modifier if you want to show a basic
authorization concept. Judges are grading the blockchain concept, not
Solidity sophistication.

### 4.2 Spring Boot Backend

Suggested package layout:

```
com.evidence.integrity
├── controller/
│   ├── EvidenceController.java      // POST /evidence, GET /evidence/{id}, POST /evidence/{id}/verify
│   └── CaseController.java          // GET /cases/{caseId}/evidence
├── service/
│   ├── EvidenceService.java         // orchestrates hashing + chain call + DB save
│   ├── HashingService.java          // SHA-256 via Java's MessageDigest
│   └── BlockchainService.java       // wraps the Web3j-generated contract class
├── repository/
│   └── EvidenceMetadataRepository.java   // Spring Data JPA
├── model/
│   ├── EvidenceMetadata.java        // JPA entity: id, caseId, fileName, storagePath, uploader, uploadedAt, txHash
│   └── dto/                         // request/response DTOs
└── config/
    └── Web3jConfig.java             // bean: Web3j client + loaded contract instance
```

Key dependencies (`pom.xml`):
- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa` + `h2` (or `postgresql` if you want it to
  look production-grade)
- `org.web3j:core` (Web3j — Java library for talking to Ethereum nodes and
  calling smart contracts)
- `spring-boot-starter-thymeleaf` (if going with server-rendered UI)
- `spring-boot-starter-validation`

### 4.3 Hashing

Use `java.security.MessageDigest.getInstance("SHA-256")`, stream the
uploaded `MultipartFile` through it in chunks (don't load huge files fully
into memory), hex-encode the digest, convert to `bytes32` for the Solidity
call via Web3j's `Numeric.hexStringToByteArray`.

### 4.4 Blockchain integration (Web3j)

1. Compile `EvidenceRegistry.sol` with Hardhat (or `solc` directly) to get
   the ABI + bytecode.
2. Run Web3j's code generator against the ABI to produce
   `EvidenceRegistry.java` — a typed Java class with methods matching your
   Solidity functions (`registerEvidence(...)`, `getEvidence(...)`, etc.),
   generated straight into your Spring Boot module.
3. `Web3jConfig` builds a `Web3j` instance pointed at your local node's
   RPC URL (e.g. `http://127.0.0.1:8545` for Hardhat), loads a `Credentials`
   object from a dev private key, and loads the deployed contract by
   address using the generated wrapper's `.load(...)`.
4. `BlockchainService` calls the generated methods and returns
   `TransactionReceipt` (for writes) or the decoded struct (for reads).

### 4.5 Database schema (metadata only — never the hash-of-record itself
needs duplicating here, but it's fine to cache it for fast listing)

```sql
evidence_metadata
------------------
id              BIGINT PK
case_id         VARCHAR
file_name       VARCHAR
storage_path    VARCHAR
sha256_hash     VARCHAR      -- cached copy; source of truth is on-chain
uploader        VARCHAR
uploaded_at     TIMESTAMP
chain_evidence_id BIGINT     -- id returned by registerEvidence on-chain
tx_hash         VARCHAR
```

## 5. Build Order (suggested sequence, ~2–3 week timeline)

1. **Week 1 — Chain layer**
   - Write and test `EvidenceRegistry.sol` in Hardhat (unit tests: register,
     read back, hash-mismatch detection).
   - Deploy to local Hardhat node, confirm you can call it manually via the
     Hardhat console.
2. **Week 1–2 — Backend skeleton**
   - Scaffold Spring Boot project (Spring Initializr: Web, JPA, H2,
     Validation, Thymeleaf).
   - Add Web3j dependency, generate the contract wrapper, wire up
     `Web3jConfig` and confirm the backend can read from the deployed
     contract (e.g. a health-check endpoint that calls `nextId()`).
3. **Week 2 — Core flow**
   - Implement upload endpoint: file → hash → on-chain register → save
     metadata row → return evidence ID + tx hash.
   - Implement verify endpoint: file → hash → chain lookup by evidence ID →
     compare → return VERIFIED/TAMPERED.
4. **Week 2–3 — Frontend + polish**
   - Minimal pages: upload form, case evidence list, verify form with a
     clear PASS/TAMPERED result banner.
   - Seed a demo case with 2–3 evidence items so the presentation doesn't
     start from an empty database.
5. **Week 3 — Presentation prep**
   - Rehearse the exact 6-step tamper-detection demo under 3 minutes.
   - Slide should show the architecture diagram (§3) and explicitly state
     the "detects, doesn't prevent" caveat from §1 — this is the kind of
     nuance that separates a strong submission from a generic one.

## 6. Stretch Goals (only if core flow is solid early)

- Role-based access: only accounts with an "Investigator" role can call
  `registerEvidence` (Solidity `modifier` + a simple role registry).
- Multiple evidence items per case with a case-level Merkle root instead of
  one hash per file, to show a more advanced integrity scheme.
- Event log viewer: subscribe to `EvidenceRegistered` events via Web3j's
  reactive `Flowable` API and show a live audit trail.

## 7. What NOT to do

- Don't store evidence files on-chain (cost, size, and it defeats the
  confidentiality point of the demo).
- Don't try to run this against a public testnet for the class demo — local
  Hardhat/Ganache avoids gas, faucets, and network flakiness during your
  3-minute window.
- Don't over-engineer the smart contract with upgradability/proxy patterns —
  it adds risk without adding to the grading criteria.
