const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Progreso - Pendiente de implementar' });
});

router.get('/stats', (req, res) => {
  res.json({ message: 'Estadísticas - Pendiente de implementar' });
});

module.exports = router;

