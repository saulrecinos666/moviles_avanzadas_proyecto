const express = require('express');
const router = express.Router();

// GET /api/activity - Obtener actividad física
router.get('/', (req, res) => {
  res.json({ message: 'Actividad física - Pendiente de implementar' });
});

// POST /api/activity - Registrar actividad física
router.post('/', (req, res) => {
  res.json({ message: 'Registrar actividad - Pendiente de implementar' });
});

module.exports = router;

