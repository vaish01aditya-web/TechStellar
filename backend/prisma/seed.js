// Run with: npm run seed
// Seeds the five presence-check rules that are directly justified by the
// problem statement (all ACTIVE), plus two example format rules left in
// DRAFT + requiresLegalVerification=true, since their exact thresholds
// need to come from the actual Legal Metrology Rules 2011 text rather than
// being invented here. Also creates one demo user per role for local testing.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const RULES = [
  {
    ruleCode: 'RULE-LM-001',
    name: 'Manufacturer / Packer / Importer Name & Address Present',
    description: 'The name and address of the manufacturer, packer, or importer must be declared on the package.',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: ['MANUFACTURER_NAME_ADDRESS'],
    status: 'ACTIVE',
  },
  {
    ruleCode: 'RULE-LM-002',
    name: 'Net Quantity Declaration Present',
    description: 'The net quantity of the commodity must be declared on the package.',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: ['NET_QUANTITY'],
    status: 'ACTIVE',
  },
  {
    ruleCode: 'RULE-LM-003',
    name: 'MRP Declaration Present',
    description: 'The Maximum Retail Price must be declared on the package.',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: ['MRP'],
    status: 'ACTIVE',
  },
  {
    ruleCode: 'RULE-LM-004',
    name: 'Month & Year of Manufacture/Packing/Import Present',
    description: 'The month and year of manufacture, packing, or import must be declared on the package.',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: ['MFG_DATE'],
    status: 'ACTIVE',
  },
  {
    ruleCode: 'RULE-LM-005',
    name: 'Consumer Care Details Present',
    description: 'Consumer care / grievance contact details must be declared on the package.',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: ['CONSUMER_CARE'],
    status: 'ACTIVE',
  },
  {
    ruleCode: 'RULE-LM-006',
    name: 'MRP Format Requirements (PENDING LEGAL VERIFICATION)',
    description:
      'Placeholder for the exact MRP formatting/rounding requirements under the 2011 Rules. Do not activate until the statutory text is confirmed and validationConfig.pattern is set accordingly.',
    validationType: 'FORMAT',
    applicableDeclarationTypes: ['MRP'],
    validationConfig: {},
    requiresLegalVerification: true,
    status: 'DRAFT',
  },
  {
    ruleCode: 'RULE-LM-007',
    name: 'Minimum Font Size for Mandatory Declarations (PENDING LEGAL VERIFICATION)',
    description:
      'Placeholder — automated physical font-size measurement from an uncalibrated photo is not reliable (see architecture notes). Requires either a calibrated capture process or manual verification.',
    validationType: 'FORMAT',
    applicableDeclarationTypes: ['MRP', 'NET_QUANTITY'],
    validationConfig: {},
    requiresLegalVerification: true,
    status: 'DRAFT',
  },
];

const DEMO_USERS = [
  { email: 'admin@demo.gov.in', fullName: 'Demo Admin', role: 'ADMIN' },
  { email: 'officer@demo.gov.in', fullName: 'Demo Officer', role: 'OFFICER' },
  { email: 'reviewer@demo.gov.in', fullName: 'Demo Reviewer', role: 'REVIEWER' },
];
const DEMO_PASSWORD = 'Password123!';

async function main() {
  for (const rule of RULES) {
    await prisma.rule.upsert({
      where: { ruleCode_version: { ruleCode: rule.ruleCode, version: 1 } },
      update: {},
      create: { ...rule, version: 1 },
    });
  }
  console.log(`Seeded ${RULES.length} rules.`);

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashed },
    });
  }
  console.log(`Seeded ${DEMO_USERS.length} demo users (password for all: "${DEMO_PASSWORD}").`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
