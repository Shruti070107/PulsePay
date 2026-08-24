const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

router.post('/detect', incidentController.detectIncidents);
router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncidentById);
router.patch('/:id/status', incidentController.updateIncidentStatus);
router.post('/:id/resolve', incidentController.resolveIncident);
router.post('/:id/investigate', incidentController.investigateIncident);
router.get('/:id/investigations', incidentController.getIncidentInvestigations);
router.patch('/:id/actions', incidentController.updateActionStatus);

module.exports = router;
