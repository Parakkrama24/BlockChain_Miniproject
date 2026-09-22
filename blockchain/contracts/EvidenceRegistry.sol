// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EvidenceRegistry {

    // One evidence item's on-chain record.
    // Only the hash is stored here — never the actual file.
    struct EvidenceRecord {
        string caseId;        // which criminal case this evidence belongs to
        string fileName;      // original file name, for display purposes only
        bytes32 sha256Hash;   // SHA-256 hash of the file, computed off-chain
        address uploader;     // which account registered this evidence
        uint256 timestamp;    // block time when it was registered
    }

    // evidenceId -> record. This is the permanent, tamper-evident storage.
    mapping(uint256 => EvidenceRecord) public records;

    // Auto-incrementing counter used to hand out unique evidence IDs.
    // Starts at 0 (Solidity's default for uint256).
    uint256 public nextId;

    // Emitted every time evidence is registered — lets off-chain apps
    // (like the Spring Boot backend) watch for new registrations
    // without having to poll contract storage.
    event EvidenceRegistered(
        uint256 indexed evidenceId,
        string caseId,
        bytes32 sha256Hash,
        address uploader,
        uint256 timestamp
    );

    // Registers a new piece of evidence and returns its assigned ID.
    // external: only callable from outside the contract (e.g. the backend).
    // calldata: cheapest storage location for read-only function params.
    function registerEvidence(
        string calldata caseId,
        string calldata fileName,
        bytes32 sha256Hash
    ) external returns (uint256 evidenceId) {
        evidenceId = nextId;      // assign the current counter value as this record's ID
        nextId = nextId + 1;      // bump the counter so the next call gets a fresh ID

        // msg.sender = whoever called this function (the "uploader")
        // block.timestamp = current block's time, used as the registration time
        records[evidenceId] = EvidenceRecord(
            caseId,
            fileName,
            sha256Hash,
            msg.sender,
            block.timestamp
        );

        emit EvidenceRegistered(evidenceId, caseId, sha256Hash, msg.sender, block.timestamp);
    }
}
