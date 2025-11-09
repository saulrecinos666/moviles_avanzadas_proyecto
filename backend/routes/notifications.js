const express = require('express');
const router = express.Router();

// GET /api/notifications - Obtener notificaciones
router.get('/', (req, res) => {
  res.json({ message: 'Notificaciones - Pendiente de implementar' });
});

// POST /api/notifications - Enviar notificación
router.post('/', (req, res) => {
  res.json({ message: 'Enviar notificación - Pendiente de implementar' });
});

module.exports = router;

