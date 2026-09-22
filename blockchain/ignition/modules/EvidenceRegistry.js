const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EvidenceRegistryModule", (m) => {
  const evidenceRegistry = m.contract("EvidenceRegistry");
  return { evidenceRegistry };
});