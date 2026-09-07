const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

const detailInclude = {
  product: true,
  officer: { select: { id: true, fullName: true, email: true } },
  images: true,
  declarations: { include: { sourceImage: true } },
  complianceResults: {
    orderBy: { evaluatedAt: 'desc' },
    take: 1,
    include: { violations: { include: { rule: true, reviewedBy: { select: { id: true, fullName: true } } } } },
  },
};

// GET /api/inspections?status=&q=&mine=true
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q, mine } = req.query;
    const where = {};
    if (status) where.status = status;
    if (mine === 'true') where.officerId = req.user.id;
    if (q) {
      where.OR = [
        { location: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        product: true,
        officer: { select: { id: true, fullName: true } },
        complianceResults: { orderBy: { evaluatedAt: 'desc' }, take: 1 },
        _count: { select: { images: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ inspections });
  }),
);

// POST /api/inspections  — officer creates a new draft inspection
router.post(
  '/',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { productId, productName, location, notes } = req.body;

    let resolvedProductId = productId || null;
    // Convenience: allow creating the product inline from the New Inspection form.
    if (!resolvedProductId && productName) {
      const product = await prisma.product.create({ data: { name: productName } });
      resolvedProductId = product.id;
    }

    const inspection = await prisma.inspection.create({
      data: {
        productId: resolvedProductId,
        officerId: req.user.id,
        location,
        notes,
        status: 'DRAFT',
      },
    });

    await logAudit(inspection.id, req.user.id, 'created');
    res.status(201).json({ inspection });
  }),
);

// GET /api/inspections/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const inspection = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    res.json({ inspection });
  }),
);

// PUT /api/inspections/:id
router.put(
  '/:id',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { location, notes, status } = req.body;
    const inspection = await prisma.inspection.update({
      where: { id: req.params.id },
      data: { location, notes, status },
    });
    await logAudit(inspection.id, req.user.id, 'updated', { location, notes, status });
    res.json({ inspection });
  }),
);

// DELETE /api/inspections/:id  — admin only, e.g. duplicate/test records
router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.inspection.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

module.exports = router;
