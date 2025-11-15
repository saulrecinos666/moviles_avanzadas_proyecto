const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Medicamentos - Pendiente de implementar' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Crear medicamento - Pendiente de implementar' });
});

module.exports = router;

