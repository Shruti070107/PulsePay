const Incident = require('../models/Incident');
const { runIncidentDetectionAndAggregation } = require('../services/incident/incidentAggregator');

const detectIncidents = async (req, res, next) => {
  try {
    const hours = parseInt(req.body.hours, 10) || 24;
    const result = await runIncidentDetectionAndAggregation(hours);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getIncidents = async (req, res, next) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }
    const { resolveRichIncidentDetails } = require('../services/incident/evidenceEngine');
    const richData = await resolveRichIncidentDetails(incident);
    return res.status(200).json({
      success: true,
      data: richData,
    });
  } catch (error) {
    next(error);
  }
};

const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid incident status'
        }
      });
    }

    const incident = await Incident.findOneAndUpdate(
      { incidentId: req.params.id },
      { status },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

const resolveIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOneAndUpdate(
      { incidentId: req.params.id },
      { status: 'resolved' },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

const { runIncidentInvestigation } = require('../services/ai');
const Investigation = require('../models/Investigation');

const investigateIncident = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const investigation = await runIncidentInvestigation(incidentId);
    return res.status(201).json({
      success: true,
      data: {
        incident: incidentId,
        investigation
      }
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentInvestigations = async (req, res, next) => {
  try {
    const incidentId = req.params.id;
    const investigations = await Investigation.find({ incidentId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: investigations.length,
      data: investigations
    });
  } catch (error) {
    next(error);
  }
};

const updateActionStatus = async (req, res, next) => {
  try {
    const { actionId, status } = req.body;
    if (!['TODO', 'IN_PROGRESS', 'DONE', 'DISMISSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid status. Must be one of TODO, IN_PROGRESS, DONE, DISMISSED'
        }
      });
    }

    const incident = await Incident.findOne({ incidentId: req.params.id });
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Incident record not found'
        }
      });
    }

    const action = incident.operatorActionCenter.find(a => a.id === actionId);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Action task not found'
        }
      });
    }

    action.status = status;
    await incident.save();

    return res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  detectIncidents,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  resolveIncident,
  investigateIncident,
  getIncidentInvestigations,
  updateActionStatus
};
