-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OFFICER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'PROCESSING', 'ANALYZED', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('FRONT', 'BACK', 'LABEL', 'NUTRITION', 'EVIDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeclarationType" AS ENUM ('MANUFACTURER_NAME_ADDRESS', 'NET_QUANTITY', 'MRP', 'MFG_DATE', 'CONSUMER_CARE', 'OTHER');

-- CreateEnum
CREATE TYPE "RuleValidationType" AS ENUM ('PRESENCE', 'FORMAT');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('ACTIVE', 'DRAFT', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'NEEDS_HUMAN_REVIEW', 'ANALYSIS_FAILED');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('FLAGGED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HumanVerificationStatus" AS ENUM ('PENDING', 'VERIFIED_VALID', 'VERIFIED_VIOLATION');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OFFICER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "manufacturerName" TEXT,
    "manufacturerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "officerId" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "notes" TEXT,
    "ruleEngineVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT,
    "imageType" "ImageType" NOT NULL DEFAULT 'OTHER',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedDeclaration" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "sourceImageId" TEXT,
    "declarationType" "DeclarationType" NOT NULL,
    "rawValue" TEXT,
    "normalizedValue" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" SERIAL NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "validationType" "RuleValidationType" NOT NULL,
    "applicableDeclarationTypes" "DeclarationType"[],
    "validationConfig" JSONB NOT NULL DEFAULT '{}',
    "requiresLegalVerification" BOOLEAN NOT NULL DEFAULT false,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceResult" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "overallStatus" "ComplianceStatus" NOT NULL,
    "ruleEngineVersion" TEXT NOT NULL,
    "summary" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "complianceResultId" TEXT NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "declarationId" TEXT,
    "status" "ViolationStatus" NOT NULL DEFAULT 'FLAGGED',
    "expectedRequirement" TEXT NOT NULL,
    "actualObservation" TEXT,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "humanVerificationStatus" "HumanVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "filePath" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Inspection_officerId_idx" ON "Inspection"("officerId");

-- CreateIndex
CREATE INDEX "Inspection_status_idx" ON "Inspection"("status");

-- CreateIndex
CREATE INDEX "ProductImage_inspectionId_idx" ON "ProductImage"("inspectionId");

-- CreateIndex
CREATE INDEX "ExtractedDeclaration_inspectionId_idx" ON "ExtractedDeclaration"("inspectionId");

-- CreateIndex
CREATE INDEX "ExtractedDeclaration_declarationType_idx" ON "ExtractedDeclaration"("declarationType");

-- CreateIndex
CREATE INDEX "Rule_status_idx" ON "Rule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_ruleCode_version_key" ON "Rule"("ruleCode", "version");

-- CreateIndex
CREATE INDEX "ComplianceResult_inspectionId_idx" ON "ComplianceResult"("inspectionId");

-- CreateIndex
CREATE INDEX "Violation_complianceResultId_idx" ON "Violation"("complianceResultId");

-- CreateIndex
CREATE INDEX "Violation_status_idx" ON "Violation"("status");

-- CreateIndex
CREATE INDEX "Report_inspectionId_idx" ON "Report"("inspectionId");

-- CreateIndex
CREATE INDEX "AuditLog_inspectionId_idx" ON "AuditLog"("inspectionId");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedDeclaration" ADD CONSTRAINT "ExtractedDeclaration_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedDeclaration" ADD CONSTRAINT "ExtractedDeclaration_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "ProductImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceResult" ADD CONSTRAINT "ComplianceResult_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_complianceResultId_fkey" FOREIGN KEY ("complianceResultId") REFERENCES "ComplianceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "ExtractedDeclaration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
