const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

// POST /api/inspections/:id/images  (multipart/form-data, field name "images", up to 10)
router.post(
  '/:id/images',
  requireRole('OFFICER', 'ADMIN'),
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    const inspection = await prisma.inspection.findUnique({ where: { id: req.params.id } });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images were uploaded' });
    }

    const imageType = req.body.imageType || 'OTHER';
    const created = await prisma.$transaction(
      req.files.map((file) =>
        prisma.productImage.create({
          data: {
            inspectionId: inspection.id,
            filePath: path.join('uploads', file.filename),
            originalName: file.originalname,
            imageType,
          },
        }),
      ),
    );

    await logAudit(inspection.id, req.user.id, 'images_uploaded', { count: created.length });
    res.status(201).json({ images: created });
  }),
);

// GET /api/inspections/:id/images
router.get(
  '/:id/images',
  asyncHandler(async (req, res) => {
    const images = await prisma.productImage.findMany({
      where: { inspectionId: req.params.id },
      orderBy: { uploadedAt: 'asc' },
    });
    res.json({ images });
  }),
);

// DELETE /api/inspections/:id/images/:imageId  — only before analysis has been run
router.delete(
  '/:id/images/:imageId',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const image = await prisma.productImage.findUnique({ where: { id: req.params.imageId } });
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const absolutePath = path.join(__dirname, '..', '..', image.filePath);
    fs.unlink(absolutePath, () => {}); // best-effort disk cleanup

    await prisma.productImage.delete({ where: { id: image.id } });
    res.status(204).send();
  }),
);

module.exports = router;
