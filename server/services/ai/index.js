const { buildIncidentContext } = require('./incidentContextBuilder');
const { buildSystemPrompt, buildUserPrompt } = require('./promptBuilder');
const { queryGemini, queryMockProvider } = require('./aiProvider');
const { validateAndFormatResponse, buildFallbackResponse } = require('./responseValidator');
const Investigation = require('../../models/Investigation');
const { randomId } = require('../../utils/idGenerator');

const runIncidentInvestigation = async (incidentId) => {
  let context = null;
  try {
    context = await buildIncidentContext(incidentId);
  } catch (err) {
    console.error(`[AI Index] Failed to compile context for incident ${incidentId}:`, err.message);
    throw err;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  let rawResponse = '';
  let analysis = null;

  try {
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_GEMINI_API_KEY') {
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(context);

      rawResponse = await queryGemini(systemPrompt, userPrompt, apiKey);
      analysis = validateAndFormatResponse(rawResponse, context);
    } else {
      rawResponse = queryMockProvider(context);
      analysis = validateAndFormatResponse(rawResponse, context);
    }
  } catch (err) {
    console.error(`[AI Index] Exception encountered during AI flow: ${err.message}`);
    analysis = buildFallbackResponse(context, `Execution error: ${err.message}`);
    rawResponse = JSON.stringify(analysis);
  }

  const investigationId = `INV-${randomId(6).toUpperCase()}`;
  
  const investigationDoc = await Investigation.create({
    investigationId,
    incidentId: context.incidentId,
    summary: analysis.summary,
    probableRootCause: analysis.probableRootCause,
    confidence: analysis.confidence,
    confidenceExplanation: analysis.confidenceExplanation,
    facts: analysis.facts,
    inferences: analysis.inferences,
    evidence: analysis.evidence,
    financialImpact: analysis.financialImpact,
    customerImpact: analysis.customerImpact,
    recommendedActions: analysis.recommendedActions,
    unknowns: analysis.unknowns,
    rawModelResponse: rawResponse
  });

  return investigationDoc;
};

module.exports = {
  runIncidentInvestigation
};
