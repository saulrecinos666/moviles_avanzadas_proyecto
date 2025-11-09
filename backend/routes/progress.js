const express = require('express');
const router = express.Router();

// GET /api/progress - Obtener progreso
router.get('/', (req, res) => {
  res.json({ message: 'Progreso - Pendiente de implementar' });
});

// GET /api/progress/stats - Obtener estadísticas
router.get('/stats', (req, res) => {
  res.json({ message: 'Estadísticas - Pendiente de implementar' });
});

module.exports = router;

