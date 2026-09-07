const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/products?q=search
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const products = await prisma.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { brand: { contains: q, mode: 'insensitive' } },
              { manufacturerName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ products });
  }),
);

// POST /api/products  — officer or admin
router.post(
  '/',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { name, brand, category, manufacturerName, manufacturerAddress } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const product = await prisma.product.create({
      data: { name, brand, category, manufacturerName, manufacturerAddress },
    });
    res.status(201).json({ product });
  }),
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { inspections: { orderBy: { createdAt: 'desc' } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  }),
);

// PUT /api/products/:id
router.put(
  '/:id',
  requireRole('OFFICER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { name, brand, category, manufacturerName, manufacturerAddress } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, brand, category, manufacturerName, manufacturerAddress },
    });
    res.json({ product });
  }),
);

// DELETE /api/products/:id  — admin only
router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

module.exports = router;
