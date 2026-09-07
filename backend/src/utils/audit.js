const prisma = require('../config/prismaClient');

async function logAudit(inspectionId, actorId, action, metadata = null) {
  try {
    await prisma.auditLog.create({
      data: { inspectionId, actorId, action, metadata },
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
