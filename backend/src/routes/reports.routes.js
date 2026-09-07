const express = require('express');
const path = require('path');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateComplianceReportPdf } = require('../services/pdfService');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

// POST /api/inspections/:id/reports — generate a new PDF report
router.post(
  '/:id/reports',
  requireRole('OFFICER', 'ADMIN', 'REVIEWER'),
  asyncHandler(async (req, res) => {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        officer: true,
        declarations: true,
        complianceResults: {
          orderBy: { evaluatedAt: 'desc' },
          take: 1,
          include: { violations: { include: { rule: true } } },
        },
      },
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    if (inspection.complianceResults.length === 0) {
      return res.status(400).json({ error: 'Run compliance evaluation before generating a report' });
    }

    const filePath = await generateComplianceReportPdf(inspection);
    const previousCount = await prisma.report.count({ where: { inspectionId: inspection.id } });

    const report = await prisma.report.create({
      data: {
        inspectionId: inspection.id,
        format: 'PDF',
        filePath: path.relative(path.join(__dirname, '..', '..'), filePath),
        version: previousCount + 1,
        generatedById: req.user.id,
      },
    });

    await logAudit(inspection.id, req.user.id, 'report_generated', { reportId: report.id });
    res.status(201).json({ report });
  }),
);

// GET /api/inspections/:id/reports — list past reports for this inspection
router.get(
  '/:id/reports',
  asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
      where: { inspectionId: req.params.id },
      orderBy: { generatedAt: 'desc' },
    });
    res.json({ reports });
  }),
);

module.exports = router;
