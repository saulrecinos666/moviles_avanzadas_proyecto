const express = require('express');
const router = express.Router();

// GET /api/medications - Obtener medicamentos
router.get('/', (req, res) => {
  res.json({ message: 'Medicamentos - Pendiente de implementar' });
});

// POST /api/medications - Crear medicamento
router.post('/', (req, res) => {
  res.json({ message: 'Crear medicamento - Pendiente de implementar' });
});

module.exports = router;

