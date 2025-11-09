const express = require('express');
const router = express.Router();

// GET /api/users/profile - Obtener perfil del usuario
router.get('/profile', (req, res) => {
  res.json({ message: 'Perfil de usuario - Pendiente de implementar' });
});

// PUT /api/users/profile - Actualizar perfil
router.put('/profile', (req, res) => {
  res.json({ message: 'Actualizar perfil - Pendiente de implementar' });
});

module.exports = router;

