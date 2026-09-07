const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const RETRY_CONFIDENCE = 0.72;
const ANCHORED_WEIGHT = 0.95;
const FALLBACK_WEIGHT = 0.55;

const FIELD_MATCHERS = {
  MRP: [
    /m\s*\.?r\s*\.?p\s*[^\n]{0,90}?((?:₹|rs\.?|inr)\s*[0-9oilszsb]{1,6}(?:[.,][0-9oilszsb]{1,2})?\s*(?:\/-)?|[0-9oilszsb]{1,6}(?:[.,][0-9oilszsb]{1,2})?\s*(?:\/-)?)/i,
    /(?:₹|rs\.?|inr)\s*[0-9oilszsb]{1,6}(?:[.,][0-9oilszsb]{1,2})?\s*(?:\/-)?/i,
  ],
  NET_QUANTITY: [
    /net\s*(?:qty|quantity|weight|wt|volume|content)\s*[:\-.\s]{0,15}[^\n]{0,40}?([0-9]+(?:[.,][0-9]+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|mg)\b)/i,
    /\b[0-9]+(?:[.,][0-9]+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|mg)\b/i,
  ],
  MFG_DATE: [/(?:mfg|mfd|manufactur(?:ed|ing)?|pkd|packed|packing)\s*(?:date|dt)?\s*[:\-.\s]{0,12}[^\n]{0,8}(?:[a-z]{3,9}\.?\s*\d{2,4}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}[/.\-]\d{4})/i],
  EXPIRY_DATE: [/(?:best\s*before|exp(?:iry)?|use\s*by|bb)\s*[:\-.\s]{0,12}(?:[a-z]{3,9}\.?\s*\d{2,4}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}[/.\-]\d{4})/i],
  BATCH_NUMBER: [/(?:batch\s*(?:no\.?)?|lot\s*(?:no\.?)?|b\.?\s*no\.?)\s*[:#\-.\s]{0,10}([a-z0-9][a-z0-9\-/]{1,30})/i],
  FSSAI_NUMBER: [/(?:fssai|lic(?:ence|ense)?\s*no\.?)\s*[:#\-.\s]{0,12}([0-9\s-]{10,18})/i, /\b[0-9]{14}\b/],
  CONSUMER_CARE: [/(?:consumer|customer)\s*care[^\n]{0,120}/i, /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, /\b1800[\s-]?\d{3}[\s-]?\d{4}\b/i],
  MANUFACTURER_NAME_ADDRESS: [/(?:manufactured|mfd\.?|marketed|packed|imported)\s*by\s*[:\-.\s]{0,5}[^\n]{5,150}/i, /[^\n]{0,80}\b(?:pvt\.?\s*ltd\.?|private\s+limited|limited|industries|foods|enterprises|inc\.?)\b[^\n]{0,80}/i],
};

function normalizeOcrCharacters(value) {
  return value.replace(/[|Il]/g, '1').replace(/[oO]/g, '0').replace(/[sS]/g, '5').replace(/[bB]/g, '8').replace(/[zZ]/g, '2');
}

function normalizeMrp(value) {
  const currencyAmount = value.match(/(?:₹|rs\.?|inr|r[5s]|b[5s]|£5)\s*([0-9oilszsb]{1,6}(?:[.,][0-9oilszsb]{1,2})?)/i);
  const candidate = normalizeOcrCharacters(value).replace(/,/g, '.');
  const amount = currencyAmount ? currencyAmount[1] : candidate.match(/\d[\d.]*/g)?.pop();
  if (!amount) return null;
  const normalizedAmount = normalizeOcrCharacters(amount).replace(/\.+/g, '.');
  const number = Number(normalizedAmount);
  if (!Number.isFinite(number) || number <= 0 || number > 100000) return null;
  return `MRP Rs. ${normalizedAmount}`;
}

function validateField(field, value) {
  if (!value) return false;
  if (field === 'MRP') return Boolean(normalizeMrp(value));
  if (field === 'NET_QUANTITY') return /\d+(?:[.,]\d+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|mg)\b/i.test(value);
  if (field === 'MFG_DATE' || field === 'EXPIRY_DATE') return /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}[/.\-]\d{4}/i.test(value);
  if (field === 'FSSAI_NUMBER') return /\d[\d\s-]{9,17}\d/.test(value) || /\b\d{14}\b/.test(value);
  if (field === 'BATCH_NUMBER') return /[a-z0-9]{2,}/i.test(value);
  return value.trim().length >= 3;
}

function extractFieldsFromText(rawText, pageConfidence) {
  const text = rawText.replace(/\r/g, '');
  const flatText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  const result = {};

  for (const [field, patterns] of Object.entries(FIELD_MATCHERS)) {
    let best = null;
    patterns.some((pattern, matcherIndex) => {
      const match = text.match(pattern) || flatText.match(pattern);
      if (!match) return false;
      const value = match[0].replace(/\s+/g, ' ').trim();
      if (!validateField(field, value)) return false;
      const weight = matcherIndex === 0 ? ANCHORED_WEIGHT : FALLBACK_WEIGHT;
      const bonus = field === 'MRP' || field === 'FSSAI_NUMBER' ? 0.04 : 0;
      best = {
        value,
        normalizedValue: field === 'MRP' ? normalizeMrp(value) : value,
        confidence: Number(Math.min(0.99, pageConfidence * weight + bonus).toFixed(3)),
      };
      return matcherIndex === 0;
    });
    // A missing or invalid field is uncertain, not a high-confidence absence.
    result[field] = best || { value: null, normalizedValue: null, confidence: 0 };
  }
  return result;
}

async function ocrImage(image) {
  const { data } = await Tesseract.recognize(image, 'eng');
  return { text: data.text || '', pageConfidence: typeof data.confidence === 'number' ? data.confidence / 100 : 0.5 };
}

async function preprocess(filePath, region) {
  let image = sharp(filePath).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (region && width > 0 && height > 0) {
    const top = region === 'top' ? 0 : Math.floor(height * 0.5);
    image = image.extract({ left: 0, top, width, height: Math.max(1, region === 'top' ? Math.ceil(height * 0.55) : height - top) });
  }
  // The original file is always attempted first. Retry preprocessing never downsizes it.
  if (width > 0 && width < 1800) image = image.resize({ width: Math.min(2400, width * 2), withoutEnlargement: false });
  return image.grayscale().normalize().sharpen({ sigma: 1 }).png().toBuffer();
}

function needsRetry(fields) {
  return ['MRP', 'NET_QUANTITY', 'MFG_DATE', 'EXPIRY_DATE', 'BATCH_NUMBER', 'FSSAI_NUMBER'].some((field) => !fields[field]?.value || fields[field].confidence < RETRY_CONFIDENCE);
}

function mergeFields(merged, fields, sourceImageId) {
  for (const [field, extraction] of Object.entries(fields)) {
    const current = merged[field];
    if (!current || (extraction.value && (!current.value || extraction.confidence > current.confidence))) merged[field] = { ...extraction, sourceImageId };
  }
}

async function runOcrPipeline(images) {
  if (!images || images.length === 0) return { declarations: {}, failed: true };
  const merged = {};
  let anyPageSucceeded = false;

  for (const image of images) {
    try {
      const original = await ocrImage(image.filePath);
      anyPageSucceeded = true;
      let fields = extractFieldsFromText(original.text, original.pageConfidence);
      mergeFields(merged, fields, image.id);

      if (needsRetry(fields)) {
        const enhancedResult = await ocrImage(await preprocess(image.filePath));
        fields = extractFieldsFromText(enhancedResult.text, enhancedResult.pageConfidence);
        mergeFields(merged, fields, image.id);
        if (needsRetry(fields)) {
          for (const region of ['top', 'bottom']) {
            const cropResult = await ocrImage(await preprocess(image.filePath, region));
            mergeFields(merged, extractFieldsFromText(cropResult.text, cropResult.pageConfidence), image.id);
          }
        }
      }
    } catch (err) {
      console.error(`OCR failed for image ${image.id}:`, err.message);
    }
  }
  return { declarations: merged, failed: !anyPageSucceeded };
}

module.exports = { runOcrPipeline, extractFieldsFromText, validateField };