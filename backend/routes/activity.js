const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Actividad física - Pendiente de implementar' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Registrar actividad - Pendiente de implementar' });
});

module.exports = router;

