// ─────────────────────────────────────────────────────────────────────────────
// Vinculação de Skills → Subscription Plans
// Gerado a partir da coluna 2 do subscriptions.tsv cruzada com db.skills
//
// Execução (a partir da pasta web/):
//   Get-Content ..\.data\link-skills.mongo.js | docker exec -i web-mongo-1 mongosh mongodb://localhost:27017/contract_finder
//
// ou localmente (sem Docker):
//   mongosh mongodb://localhost:27017/contract_finder < ..\.data\link-skills.mongo.js
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

function update(name, skills) {
  const r = db.contracts.updateOne({ name }, { $set: { skills, updatedAt: new Date() } });
  print(`[${r.matchedCount ? (r.modifiedCount ? "UPDATED" : "NO CHANGE") : "NOT FOUND"}] ${name}  (${skills.length} skills)`);
}

// ── Base skill sets (reusados para os planos hierárquicos) ────────────────────

// UC Essentials: CM + SM + ASM + Messaging + SBC
const UC_ESSENTIALS = [
  "Communication Manager",   // CM, CC
  "System Manager",          // ASGM, SYSTEM MANAGER
  "Session Manager (ASM)",   // SM
  "Officelinx",              // IX Messaging (Basic/Advanced)
  "Aura SBC",                // SBC - Standard/Advanced
  "Enterprise SBC",          // SBC
];

// UC Advanced = UC Essentials + Presence + Workplace + Breeze
const UC_ADVANCED = [
  ...UC_ESSENTIALS,
  "Presence Server (IPS)",   // Presence Services
  "Client Applications",     // Avaya Workplace Client (IX Workplace Client / WORKPLACE)
  "Attendant Desktop",       // Avaya Workplace Client (WORKPLACE)
  "Collaboration Environment", // Breeze Platform
];

// UC Ultra = UC Advanced + Aura X for Zoom + Cloud Office Hybrid
// (sem skills mapeáveis para Aura X for Zoom / Cloud Office Hybrid no banco)
const UC_ULTRA = [
  ...UC_ADVANCED,
];

// ── Queries ───────────────────────────────────────────────────────────────────

// 1. UC Essentials License Bundle
update("UC Essentials License Bundle", UC_ESSENTIALS);

// 2. UC Advanced License Bundle (inclui tudo do Essentials)
update("UC Advanced License Bundle", UC_ADVANCED);

// 3. UC Ultra License Bundle (inclui tudo do Advanced)
//    Aura X for Zoom Workplace e Cloud Office Hybrid sem skill correspondente no banco
update("UC Ultra License Bundle", UC_ULTRA);

// 4. CC Elite Voice License Bundle = UC Advanced + CC Elite + CMS + Voice Portal (AAEP)
update("CC Elite Voice License Bundle", [
  ...UC_ADVANCED,
  "CMS",                       // Call Management System
  "CMS Supervisor",            // CMS Supervisor
  "Advanced Application Support", // CMS / CRM integrations
  "Voice Portal",              // Avaya Experience Portal (AAEP) IVR Ports
]);

// 5. Attendant Service: Workplace Attendant Client + Breeze Snap-in
update("Attendant Service", [
  "Attendant Desktop",         // Workplace Attendant Client
  "Collaboration Environment", // Breeze Snap-in Server
]);

// 6. Avaya Aura Contact Center (AACC)
update("Avaya Aura Contact Center (AACC)", [
  "Aura Contact Center",       // AACC Voice + Digital + Workspaces
]);

// 7. Avaya Aura CC Select (ACCS) — variante do AACC
update("Avaya Aura CC Select (ACCS)", [
  "Aura Contact Center",       // ACCS Base / Voice / Multimedia / Supervisor
]);

// 8. Avaya Experience Portal (IVR) — AAEP
update("Avaya Experience Portal (IVR)", [
  "Voice Portal",              // AAEP IVR Ports + Orchestration Designer
]);

// 9. Proactive Outreach Manager (POM)
update("Proactive Outreach Manager (POM)", [
  "Proactive Outreach Manager", // POM Base / Predictive / Preview / Digital
]);

// 10. Call Back Assist (CBA) — sem skill direta no banco
//     (CBA Base Server / CBA Port License não mapeiam a nenhuma skill existente)
update("Call Back Assist (CBA)", []);

// 11. Avaya Messaging — IX Messaging, Nuance, Mutare
update("Avaya Messaging", [
  "Officelinx",                // IX Messaging (Basic/Advanced)
]);

// 12. Application Enablement Services (AES) — TSAPI, DMCC, ASAI, CVLAN, DLG
update("Application Enablement Services (AES)", [
  "AES",                       // AES Platform + all protocol licenses
]);

// 13. Avaya Session Border Controller (ASBCE)
update("Avaya Session Border Controller (ASBCE)", [
  "Aura SBC",                  // ASBCE Standard/Advanced/Premium/HA
  "Enterprise SBC",
]);

// 14. CMS Connectors — RT/HR Data Connectors + WFM interfaces
update("CMS Connectors", [
  "CMS",                       // Real-Time & Historical Data Connectors
  "CMS Supervisor",
  "Advanced Application Support", // 3rd party WFM (Calabrio, IEX, etc.)
  "Workforce Management",      // WFO integrations
]);

// 15. Google Dialogflow Connector — para Avaya Experience Portal (AEP)
update("Google Dialogflow Connector", [
  "Voice Portal",              // Dialogflow conectado ao AAEP
]);

// 16. Avaya IP Office Platform
update("Avaya IP Office Platform", [
  "IP Office",                 // IPO Platform + User Profiles + CTI + Receptionist
]);

// 17. Avaya Experience Platform (AXP / CCaaS) — sem skill mapeável no banco
//     (AXP, PUB CCAAS, IX DIGITAL não têm skill correspondente)
update("Avaya Experience Platform (AXP / CCaaS)", []);

// 18. Avaya Spaces
update("Avaya Spaces", [
  "Zang Spaces",               // Avaya Spaces Business/Power
]);

// 19. Avaya Call Reporting / WFM — Avaya WFM + Workforce Engagement (AWE)
update("Avaya Call Reporting / WFM", [
  "Workforce Management",      // WFM + AWE (WFO, ACRA)
]);

// 20. Social Media Hub / SMCC — sem skill mapeável no banco
update("Social Media Hub / SMCC", []);

// 21–25. Camadas de serviço (não são produtos, sem skill específica)
update("Managed Services",            []);
update("Subscription Support (SUB SA)", []);
update("Subscription Upgrade (SUB UA)", []);
update("Special Alliance Contracts",  []);
update("Other",                       []);

print("\nConcluído.");
