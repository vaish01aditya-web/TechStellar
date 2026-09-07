const express = require('express');
const path = require('path');
const prisma = require('../config/prismaClient');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/reports/:reportId/download
router.get(
  '/:reportId/download',
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({ where: { id: req.params.reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const absolutePath = path.join(__dirname, '..', '..', report.filePath);
    res.download(absolutePath, `inspection-report-${report.inspectionId}.pdf`);
  }),
);

module.exports = router;
