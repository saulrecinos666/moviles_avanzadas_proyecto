const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Foro - Pendiente de implementar' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Crear post - Pendiente de implementar' });
});

module.exports = router;

