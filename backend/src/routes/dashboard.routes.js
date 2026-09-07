const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const totalInspections = await prisma.inspection.count();

    // Latest compliance result per inspection (kept in JS since a hackathon
    // dataset is small; a materialized "latest result" column would be the
    // production optimization if this dataset grows).
    const allResults = await prisma.complianceResult.findMany({
      orderBy: { evaluatedAt: 'desc' },
      select: { inspectionId: true, overallStatus: true },
    });
    const latestByInspection = new Map();
    for (const r of allResults) {
      if (!latestByInspection.has(r.inspectionId)) latestByInspection.set(r.inspectionId, r.overallStatus);
    }
    const statusCounts = { COMPLIANT: 0, NON_COMPLIANT: 0, NEEDS_HUMAN_REVIEW: 0, ANALYSIS_FAILED: 0 };
    for (const status of latestByInspection.values()) statusCounts[status] = (statusCounts[status] || 0) + 1;

    const recentInspections = await prisma.inspection.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        officer: { select: { fullName: true } },
        complianceResults: { take: 1, orderBy: { evaluatedAt: 'desc' } },
      },
    });

    const grouped = await prisma.violation.groupBy({
      by: ['ruleId'],
      _count: { ruleId: true },
      orderBy: { _count: { ruleId: 'desc' } },
      take: 5,
    });
    const ruleIds = grouped.map((g) => g.ruleId);
    const rules = await prisma.rule.findMany({ where: { id: { in: ruleIds } } });
    const topViolationCategories = grouped.map((g) => ({
      rule: rules.find((r) => r.id === g.ruleId),
      count: g._count.ruleId,
    }));

    res.json({
      totalInspections,
      compliant: statusCounts.COMPLIANT,
      nonCompliant: statusCounts.NON_COMPLIANT,
      needsReview: statusCounts.NEEDS_HUMAN_REVIEW,
      analysisFailed: statusCounts.ANALYSIS_FAILED,
      recentInspections,
      topViolationCategories,
    });
  }),
);

module.exports = router;
