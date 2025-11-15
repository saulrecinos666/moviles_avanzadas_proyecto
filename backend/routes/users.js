const express = require('express');
const router = express.Router();

router.get('/profile', (req, res) => {
  res.json({ message: 'Perfil de usuario - Pendiente de implementar' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Actualizar perfil - Pendiente de implementar' });
});

module.exports = router;

