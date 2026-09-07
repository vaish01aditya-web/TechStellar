const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const STATUS_LABEL = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON-COMPLIANT',
  NEEDS_HUMAN_REVIEW: 'NEEDS HUMAN REVIEW',
  ANALYSIS_FAILED: 'ANALYSIS FAILED',
};

/**
 * Renders a compliance report PDF purely from already-decided data
 * (inspection + complianceResult + violations + declarations). It does not
 * re-evaluate or add findings — it's a faithful record of the rule engine's
 * output plus whatever a human reviewer has since confirmed.
 *
 * @returns {Promise<string>} absolute file path of the generated PDF
 */
function generateComplianceReportPdf(inspection) {
  return new Promise((resolve, reject) => {
    const fileName = `inspection-${inspection.id}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const result = inspection.complianceResults?.[0];

    doc.fontSize(18).text('Legal Metrology Compliance Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666').text(
      'Automated screening tool output. This is not a legal determination and is subject to verification by an authorized officer.',
    );
    doc.fillColor('#000').moveDown(1);

    doc.fontSize(11);
    doc.text(`Inspection ID: ${inspection.id}`);
    doc.text(`Product: ${inspection.product?.name || 'Unrecorded'}`);
    doc.text(`Officer: ${inspection.officer?.fullName || 'Unknown'}`);
    doc.text(`Inspection date: ${new Date(inspection.createdAt).toLocaleDateString()}`);
    doc.text(`Location: ${inspection.location || '—'}`);
    doc.moveDown(1);

    doc.fontSize(14).text('Compliance Result', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(12).text(`Status: ${result ? STATUS_LABEL[result.overallStatus] : 'NOT EVALUATED'}`);
    doc.fontSize(10).fillColor('#333').text(result?.summary || '');
    doc.fillColor('#000').moveDown(1);

    doc.fontSize(14).text('Extracted Declarations', { underline: true });
    doc.moveDown(0.3);
    (inspection.declarations || []).forEach((d) => {
      doc.fontSize(10).text(
        `${d.declarationType}: ${d.rawValue || 'Not detected'}  (confidence: ${
          d.confidence != null ? Math.round(d.confidence * 100) + '%' : 'n/a'
        })`,
      );
    });
    doc.moveDown(1);

    doc.fontSize(14).text('Violations / Flagged Items', { underline: true });
    doc.moveDown(0.3);
    const violations = result?.violations || [];
    if (violations.length === 0) {
      doc.fontSize(10).text('None.');
    } else {
      violations.forEach((v, i) => {
        doc.fontSize(11).fillColor('#000').text(`${i + 1}. ${v.rule?.name || 'Rule ' + v.ruleId}`);
        doc.fontSize(9).fillColor('#333');
        doc.text(`   Expected: ${v.expectedRequirement}`);
        doc.text(`   Observed: ${v.actualObservation || '—'}`);
        doc.text(`   Reason: ${v.reason}`);
        doc.text(`   Confidence: ${v.confidence != null ? Math.round(v.confidence * 100) + '%' : 'n/a'}`);
        doc.text(`   Human verification: ${v.humanVerificationStatus}${v.reviewNotes ? ' — ' + v.reviewNotes : ''}`);
        doc.fillColor('#000').moveDown(0.4);
      });
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateComplianceReportPdf, REPORTS_DIR };
