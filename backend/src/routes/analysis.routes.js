const express = require('express');
const path = require('path');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { runOcrPipeline } = require('../services/ocrService');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

// POST /api/inspections/:id/analyze
// Runs OCR + field extraction over every image on the inspection and stores
// the result as ExtractedDeclaration rows. Does NOT compute compliance —
// that's a separate, explicit step (POST /:id/evaluate-compliance) so the
// officer can inspect what was read before the rule engine runs on it.
router.post(
  '/:id/analyze',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: { images: true },
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    if (inspection.images.length === 0) {
      return res.status(400).json({ error: 'Upload at least one image before running analysis' });
    }

    await prisma.inspection.update({ where: { id: inspection.id }, data: { status: 'PROCESSING' } });

    const imagesForOcr = inspection.images.map((img) => ({
      id: img.id,
      filePath: path.join(__dirname, '..', '..', img.filePath),
    }));

    const { declarations, failed } = await runOcrPipeline(imagesForOcr);

    // Re-running analysis replaces the previous extraction rather than
    // accumulating duplicates.
    await prisma.extractedDeclaration.deleteMany({ where: { inspectionId: inspection.id } });

    const rows = Object.entries(declarations).map(([declarationType, extraction]) => ({
      inspectionId: inspection.id,
      declarationType,
      sourceImageId: extraction.sourceImageId || null,
      rawValue: extraction.value,
      normalizedValue: extraction.value ? extraction.value.trim() : null,
      confidence: extraction.confidence,
    }));

    if (rows.length > 0) {
      await prisma.extractedDeclaration.createMany({ data: rows });
    }

    await prisma.inspection.update({
      where: { id: inspection.id },
      data: { status: failed ? 'DRAFT' : 'ANALYZED' },
    });

    await logAudit(inspection.id, req.user.id, 'analyzed', { failed, fieldCount: rows.length });

    const savedDeclarations = await prisma.extractedDeclaration.findMany({
      where: { inspectionId: inspection.id },
    });

    res.json({ declarations: savedDeclarations, ocrFailed: failed });
  }),
);

module.exports = router;
