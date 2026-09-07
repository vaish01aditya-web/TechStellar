const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { evaluateCompliance, RULE_ENGINE_VERSION } = require('../services/ruleEngine');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

// POST /api/inspections/:id/evaluate-compliance
// Reads whatever is currently in extracted_declarations and active rules,
// and writes a new ComplianceResult + Violation rows. Safe to re-run after
// a manual declaration correction — it always evaluates the current state.
router.post(
  '/:id/evaluate-compliance',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: { declarations: true },
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const activeRules = await prisma.rule.findMany({ where: { status: 'ACTIVE' } });
    const ocrFailed = inspection.declarations.length === 0;

    const { overallStatus, violations, summary } = evaluateCompliance(
      inspection.declarations,
      activeRules,
      ocrFailed,
    );

    const complianceResult = await prisma.complianceResult.create({
      data: {
        inspectionId: inspection.id,
        overallStatus,
        ruleEngineVersion: RULE_ENGINE_VERSION,
        summary,
        violations: { create: violations },
      },
      include: { violations: { include: { rule: true } } },
    });

    const nextStatus =
      overallStatus === 'ANALYSIS_FAILED' ? 'DRAFT' : overallStatus === 'COMPLIANT' ? 'CLOSED' : 'UNDER_REVIEW';

    await prisma.inspection.update({
      where: { id: inspection.id },
      data: { status: nextStatus, ruleEngineVersion: RULE_ENGINE_VERSION },
    });

    await logAudit(inspection.id, req.user.id, 'evaluated', { overallStatus, violationCount: violations.length });

    res.json({ complianceResult });
  }),
);

// GET /api/inspections/:id/compliance-result — latest result only
router.get(
  '/:id/compliance-result',
  asyncHandler(async (req, res) => {
    const complianceResult = await prisma.complianceResult.findFirst({
      where: { inspectionId: req.params.id },
      orderBy: { evaluatedAt: 'desc' },
      include: { violations: { include: { rule: true, reviewedBy: { select: { id: true, fullName: true } } } } },
    });
    if (!complianceResult) return res.status(404).json({ error: 'No compliance result yet for this inspection' });
    res.json({ complianceResult });
  }),
);

module.exports = router;
