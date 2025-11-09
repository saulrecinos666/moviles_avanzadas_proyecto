const express = require('express');
const router = express.Router();

// GET /api/forum - Obtener posts del foro
router.get('/', (req, res) => {
  res.json({ message: 'Foro - Pendiente de implementar' });
});

// POST /api/forum - Crear post
router.post('/', (req, res) => {
  res.json({ message: 'Crear post - Pendiente de implementar' });
});

module.exports = router;

