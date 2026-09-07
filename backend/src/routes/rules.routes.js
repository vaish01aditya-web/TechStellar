const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/rules — visible to everyone so officers can see what's being checked
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rules = await prisma.rule.findMany({ orderBy: [{ ruleCode: 'asc' }, { version: 'desc' }] });
    res.json({ rules });
  }),
);

// POST /api/rules — admin only. Always creates a DRAFT; must be explicitly
// activated so a half-configured rule never silently starts affecting
// live inspections.
router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const {
      ruleCode,
      name,
      description,
      validationType,
      applicableDeclarationTypes,
      validationConfig,
      requiresLegalVerification,
    } = req.body;

    if (!ruleCode || !name || !validationType || !applicableDeclarationTypes?.length) {
      return res
        .status(400)
        .json({ error: 'ruleCode, name, validationType and applicableDeclarationTypes are required' });
    }

    const latest = await prisma.rule.findFirst({
      where: { ruleCode },
      orderBy: { version: 'desc' },
    });

    const rule = await prisma.rule.create({
      data: {
        ruleCode,
        version: latest ? latest.version + 1 : 1,
        name,
        description,
        validationType,
        applicableDeclarationTypes,
        validationConfig: validationConfig || {},
        requiresLegalVerification: !!requiresLegalVerification,
        status: 'DRAFT',
      },
    });
    res.status(201).json({ rule });
  }),
);

// POST /api/rules/:id/activate — admin only. Deactivates any older version
// of the same rule code so only one version is ever ACTIVE at a time.
router.post(
  '/:id/activate',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.findUnique({ where: { id: Number(req.params.id) } });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    if (rule.requiresLegalVerification) {
      return res.status(400).json({
        error: 'This rule is marked as requiring legal verification and cannot be activated until reviewed.',
      });
    }

    await prisma.$transaction([
      prisma.rule.updateMany({
        where: { ruleCode: rule.ruleCode, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      }),
      prisma.rule.update({ where: { id: rule.id }, data: { status: 'ACTIVE' } }),
    ]);

    res.json({ message: `${rule.ruleCode} v${rule.version} activated` });
  }),
);

// POST /api/rules/:id/deactivate
router.post(
  '/:id/deactivate',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.update({
      where: { id: Number(req.params.id) },
      data: { status: 'INACTIVE' },
    });
    res.json({ rule });
  }),
);

module.exports = router;
