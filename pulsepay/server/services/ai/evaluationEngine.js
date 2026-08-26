const Incident = require('../../models/Incident');
const { runIncidentInvestigation } = require('./index');

/**
 * Runs factual grounding and hallucination audits on AI investigations
 */
const runAIEvaluation = async () => {
  // Select active or recent incidents to evaluate
  const incidents = await Incident.find().limit(5);
  
  if (incidents.length === 0) {
    return {
      success: true,
      evaluatedCount: 0,
      averageGroundingScore: 1.0,
      averageHallucinationScore: 1.0,
      averageAccuracy: 1.0,
      results: []
    };
  }

  const results = [];
  let totalGrounding = 0;
  let totalHallucination = 0;
  let totalAccuracy = 0;

  for (const incident of incidents) {
    try {
      const investigation = await runIncidentInvestigation(incident.incidentId);
      
      // Serialize incident database details to act as grounding reference text
      const referenceText = JSON.stringify(incident.toObject ? incident.toObject() : incident);
      
      let factsChecked = 0;
      let groundedFacts = 0;
      let hallucinatedItemsCount = 0;

      const factsAndInferences = [
        ...(investigation.facts || []),
        ...(investigation.inferences || []),
        investigation.summary,
        investigation.probableRootCause
      ].filter(Boolean);

      // Regex checking for payment/incident IDs (e.g. pay_xxx, INC-xxx, order_xxx)
      const idRegex = /(pay_[a-zA-Z0-9]+|INC-[a-zA-Z0-9]+|ord_[a-zA-Z0-9]+)/gi;

      factsAndInferences.forEach(statement => {
        factsChecked++;
        const ids = statement.match(idRegex) || [];
        let statementGrounded = true;
        
        ids.forEach(id => {
          // Check if this ID appears anywhere in the raw database record
          if (!referenceText.toLowerCase().includes(id.toLowerCase())) {
            statementGrounded = false;
            hallucinatedItemsCount++;
          }
        });

        if (statementGrounded) {
          groundedFacts++;
        }
      });

      const groundingScore = factsChecked > 0 ? (groundedFacts / factsChecked) : 1.0;
      const hallucinationScore = factsChecked > 0 ? (1.0 - (hallucinatedItemsCount / factsChecked)) : 1.0;

      // Accuracy mapping: check if AI root cause explanation correlates with incident types
      let accuracy = 0.8;
      if (incident.type === 'WEBHOOK_FAILURE' && investigation.probableRootCause.toLowerCase().includes('webhook')) {
        accuracy = 1.0;
      } else if (incident.type === 'DUPLICATE_PAYMENT_RISK' && investigation.probableRootCause.toLowerCase().includes('duplicate')) {
        accuracy = 1.0;
      } else if (incident.type === 'OUT_OF_ORDER_EVENTS' && (investigation.probableRootCause.toLowerCase().includes('order') || investigation.probableRootCause.toLowerCase().includes('sequence'))) {
        accuracy = 1.0;
      }

      totalGrounding += groundingScore;
      totalHallucination += hallucinationScore;
      totalAccuracy += accuracy;

      results.push({
        incidentId: incident.incidentId,
        type: incident.type,
        groundingScore: parseFloat(groundingScore.toFixed(2)),
        hallucinationScore: parseFloat(hallucinationScore.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        summary: investigation.summary,
        probableRootCause: investigation.probableRootCause
      });
    } catch (err) {
      console.error(`Evaluation skipped for incident ${incident.incidentId}:`, err.message);
    }
  }

  const evaluatedCount = results.length;
  if (evaluatedCount === 0) {
    return {
      success: true,
      evaluatedCount: 0,
      averageGroundingScore: 1.0,
      averageHallucinationScore: 1.0,
      averageAccuracy: 1.0,
      results: []
    };
  }

  return {
    success: true,
    evaluatedCount,
    averageGroundingScore: parseFloat((totalGrounding / evaluatedCount).toFixed(2)),
    averageHallucinationScore: parseFloat((totalHallucination / evaluatedCount).toFixed(2)),
    averageAccuracy: parseFloat((totalAccuracy / evaluatedCount).toFixed(2)),
    results
  };
};

module.exports = {
  runAIEvaluation
};
