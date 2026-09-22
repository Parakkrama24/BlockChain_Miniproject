const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");



describe("EvidenceRegistry", function () {
  let evidenceRegistry;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const EvidenceRegistry = await ethers.getContractFactory("EvidenceRegistry");
    evidenceRegistry = await EvidenceRegistry.deploy();
  });

  // tests go here
  it("should register evidence and store correct data", async function () {
    const caseId = "CASE-001";
    const fileName = "evidence.pdf";
    const hash = ethers.sha256(ethers.toUtf8Bytes("dummy file content"));

    const tx = await evidenceRegistry.registerEvidence(caseId, fileName, hash);
    await tx.wait();

    const record = await evidenceRegistry.records(0);

    expect(record.caseId).to.equal(caseId);
    expect(record.fileName).to.equal(fileName);
    expect(record.sha256Hash).to.equal(hash);
    expect(record.uploader).to.equal(owner.address);
  });

  it("should emit EvidenceRegistered event with correct args", async function () {
    const caseId = "CASE-002";
    const fileName = "photo.jpg";
    const hash = ethers.sha256(ethers.toUtf8Bytes("another file"));

    await expect(evidenceRegistry.registerEvidence(caseId, fileName, hash))
      .to.emit(evidenceRegistry, "EvidenceRegistered")
      .withArgs(0, caseId, hash, owner.address, anyValue);
  });

  it("should assign incrementing IDs to multiple registrations", async function () {
    const hash1 = ethers.sha256(ethers.toUtf8Bytes("file one"));
    const hash2 = ethers.sha256(ethers.toUtf8Bytes("file two"));

    const tx1 = await evidenceRegistry.registerEvidence("CASE-001", "a.pdf", hash1);
    await tx1.wait();

    const tx2 = await evidenceRegistry.registerEvidence("CASE-001", "b.pdf", hash2);
    await tx2.wait();

    const record0 = await evidenceRegistry.records(0);
    const record1 = await evidenceRegistry.records(1);

    expect(record0.fileName).to.equal("a.pdf");
    expect(record1.fileName).to.equal("b.pdf");
    expect(await evidenceRegistry.nextId()).to.equal(2);
  });
});
