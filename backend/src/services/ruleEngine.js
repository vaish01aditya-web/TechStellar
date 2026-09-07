/**
 * ============================================================================
 * Compliance Rule Engine — DETERMINISTIC. NOT an LLM call.
 *
 * This is the sole authority for compliance verdicts in the system. It reads
 * already-extracted declarations (produced by ocrService) and versioned rule
 * definitions (from the `rules` table), and applies plain conditional logic.
 * No AI model is invoked here, and nothing here is inferred — every verdict
 * traces back to an explicit rule and an explicit extracted value.
 *
 * IMPORTANT — "not detected" vs. "violation":
 * If a required declaration wasn't found by OCR, that is NEVER auto-reported
 * as a confirmed violation. It's flagged as NEEDS_HUMAN_REVIEW, exactly like
 * the reference example in the problem statement (consumer-care declaration
 * not detected -> "Human verification required", not "illegal").
 * ============================================================================
 */

const RULE_ENGINE_VERSION = 'rule-engine-v1.0.0';

// Below this confidence, we don't trust the OCR extraction enough to treat a
// "present" value as confirmed, or a "missing" value as confidently absent —
// either way it goes to human review rather than an automated verdict.
const CONFIDENCE_THRESHOLD = 0.55;

/**
 * @param {Array} declarations  ExtractedDeclaration rows for this inspection
 * @param {Array} rules         Active Rule rows to evaluate against
 * @param {boolean} ocrFailed   true if the OCR pipeline could not read any image at all
 * @returns {{ overallStatus: string, violations: Array }}
 */
function evaluateCompliance(declarations, rules, ocrFailed) {
  if (ocrFailed) {
    return {
      overallStatus: 'ANALYSIS_FAILED',
      violations: [],
      summary: 'No image could be read by the OCR pipeline. This is a technical failure, not a compliance finding.',
    };
  }

  const declarationByType = {};
  for (const d of declarations) {
    // If multiple rows exist for the same type, keep the highest-confidence one.
    const existing = declarationByType[d.declarationType];
    if (!existing || (d.confidence ?? 0) > (existing.confidence ?? 0)) {
      declarationByType[d.declarationType] = d;
    }
  }

  const violations = [];
  let hasConfirmedNonCompliance = false;
  let hasNeedsReview = false;

  for (const rule of rules) {
    for (const declarationType of rule.applicableDeclarationTypes) {
      const declaration = declarationByType[declarationType];
      const value = declaration?.normalizedValue ?? declaration?.rawValue ?? null;
      const confidence = declaration?.confidence ?? 0;

      if (rule.validationType === 'PRESENCE') {
        if (value === null) {
          // Not detected. Could be genuinely absent from the label, or the
          // photo/OCR simply missed it — we cannot tell the difference
          // automatically, so this always requires a human to check.
          hasNeedsReview = true;
          violations.push({
            ruleId: rule.id,
            declarationId: declaration?.id ?? null,
            status: 'FLAGGED',
            expectedRequirement: rule.description || rule.name,
            actualObservation: 'Not detected in any scanned image.',
            reason: 'Required declaration could not be detected by automated scanning.',
            confidence,
            humanVerificationStatus: 'PENDING',
          });
        } else if (confidence < CONFIDENCE_THRESHOLD) {
          // Something was detected, but we're not confident enough in the
          // read to treat this as a confirmed pass — still a human question.
          hasNeedsReview = true;
          violations.push({
            ruleId: rule.id,
            declarationId: declaration.id,
            status: 'FLAGGED',
            expectedRequirement: rule.description || rule.name,
            actualObservation: `Detected with low confidence: "${value}"`,
            reason: 'Extraction confidence below the threshold required for an automated pass.',
            confidence,
            humanVerificationStatus: 'PENDING',
          });
        }
        // else: present with acceptable confidence -> rule passes, no violation row.
      }

      if (rule.validationType === 'FORMAT' && value !== null && confidence >= CONFIDENCE_THRESHOLD) {
        const pattern = rule.validationConfig?.pattern;
        if (pattern) {
          const regex = new RegExp(pattern, 'i');
          if (!regex.test(value)) {
            hasConfirmedNonCompliance = true;
            violations.push({
              ruleId: rule.id,
              declarationId: declaration.id,
              status: 'FLAGGED',
              expectedRequirement: rule.description || rule.name,
              actualObservation: `Detected value: "${value}"`,
              reason: 'Detected value does not match the required format for this declaration.',
              confidence,
              humanVerificationStatus: 'PENDING',
            });
          }
        }
      }
    }
  }

  let overallStatus;
  if (hasConfirmedNonCompliance) {
    overallStatus = 'NON_COMPLIANT';
  } else if (hasNeedsReview) {
    overallStatus = 'NEEDS_HUMAN_REVIEW';
  } else {
    overallStatus = 'COMPLIANT';
  }

  return { overallStatus, violations, summary: buildSummary(overallStatus, violations) };
}

function buildSummary(status, violations) {
  if (status === 'COMPLIANT') return 'All active rules passed with acceptable confidence.';
  if (status === 'NON_COMPLIANT') return `${violations.length} issue(s) found, including at least one confirmed format violation.`;
  if (status === 'NEEDS_HUMAN_REVIEW') return `${violations.length} declaration(s) could not be automatically confirmed and need officer review.`;
  return 'Analysis could not be completed.';
}

module.exports = { evaluateCompliance, RULE_ENGINE_VERSION, CONFIDENCE_THRESHOLD };
