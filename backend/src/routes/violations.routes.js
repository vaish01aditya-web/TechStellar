const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

// GET /api/violations/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const violation = await prisma.violation.findUnique({
      where: { id: req.params.id },
      include: {
        rule: true,
        declaration: { include: { sourceImage: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        complianceResult: { include: { inspection: true } },
      },
    });
    if (!violation) return res.status(404).json({ error: 'Violation not found' });
    res.json({ violation });
  }),
);

// PATCH /api/violations/:id/review
// Only a reviewer (or admin) can turn an automated FLAGGED finding into a
// human-confirmed verdict. This is the explicit "human verification" step
// required by the brief — the rule engine never marks anything CONFIRMED
// on its own.
router.patch(
  '/:id/review',
  requireRole('REVIEWER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { decision, reviewNotes } = req.body; // decision: 'CONFIRM' | 'REJECT'
    if (!['CONFIRM', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be CONFIRM or REJECT' });
    }

    const violation = await prisma.violation.update({
      where: { id: req.params.id },
      data: {
        status: decision === 'CONFIRM' ? 'CONFIRMED' : 'REJECTED',
        humanVerificationStatus: decision === 'CONFIRM' ? 'VERIFIED_VIOLATION' : 'VERIFIED_VALID',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: { complianceResult: true },
    });

    await logAudit(violation.complianceResult.inspectionId, req.user.id, 'violation_reviewed', {
      violationId: violation.id,
      decision,
    });

    // If every violation under this compliance result has now been looked
    // at by a human, the inspection can move to CLOSED.
    const remaining = await prisma.violation.count({
      where: { complianceResultId: violation.complianceResultId, humanVerificationStatus: 'PENDING' },
    });
    if (remaining === 0) {
      await prisma.inspection.update({
        where: { id: violation.complianceResult.inspectionId },
        data: { status: 'CLOSED' },
      });
    }

    res.json({ violation });
  }),
);

module.exports = router;
