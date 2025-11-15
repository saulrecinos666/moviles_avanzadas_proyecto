const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Notificaciones - Pendiente de implementar' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Enviar notificación - Pendiente de implementar' });
});

module.exports = router;

