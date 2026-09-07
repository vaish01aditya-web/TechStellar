const express = require('express');
const prisma = require('../config/prismaClient');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/users
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  }),
);

// PATCH /api/users/:id  — change role or active status
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { role, isActive } = req.body;
    const data = {};
    if (role) data.role = role;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    res.json({ user });
  }),
);

module.exports = router;
