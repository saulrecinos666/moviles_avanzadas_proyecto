const express = require('express');
const router = express.Router();

// GET /api/exercises - Obtener entrenamientos
router.get('/', (req, res) => {
  res.json({ message: 'Entrenamientos - Pendiente de implementar' });
});

// POST /api/exercises - Crear entrenamiento
router.post('/', (req, res) => {
  res.json({ message: 'Crear entrenamiento - Pendiente de implementar' });
});

module.exports = router;

