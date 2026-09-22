const { ethers } = require("hardhat");

async function main() {
  const EvidenceRegistry = await ethers.getContractFactory("EvidenceRegistry");
  const evidenceRegistry = await EvidenceRegistry.deploy();
  await evidenceRegistry.waitForDeployment();

  const address = await evidenceRegistry.getAddress();
  console.log("EvidenceRegistry deployed to:", address);

  const demoEvidence = [
    { caseId: "CASE-2024-CR-045", fileName: "witness_statement.pdf", content: "witness statement content" },
    { caseId: "CASE-2024-CR-045", fileName: "crime_scene_photo.jpg", content: "photo bytes placeholder" },
    { caseId: "CASE-2024-CR-102", fileName: "forensic_report.pdf", content: "forensic report content" },
  ];

  for (const item of demoEvidence) {
    const hash = ethers.sha256(ethers.toUtf8Bytes(item.content));
    const tx = await evidenceRegistry.registerEvidence(item.caseId, item.fileName, hash);
    await tx.wait();
    console.log(`Registered: ${item.fileName} (case ${item.caseId})`);
  }

  console.log("\nSeeding complete. Contract address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
