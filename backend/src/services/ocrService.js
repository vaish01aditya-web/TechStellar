// Compatibility export: routes keep importing ocrService while the pipeline
// implementation remains isolated and testable.
module.exports = require('./ocrPipeline');
