const express = require('express');
const router = express.Router();

// GET /api/advice - Obtener consejos
router.get('/', (req, res) => {
  res.json({ message: 'Consejos - Pendiente de implementar' });
});

// GET /api/advice/personalized - Obtener consejos personalizados
router.get('/personalized', (req, res) => {
  res.json({ message: 'Consejos personalizados - Pendiente de implementar' });
});

module.exports = router;

