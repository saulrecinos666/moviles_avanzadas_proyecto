const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Consejos - Pendiente de implementar' });
});

router.get('/personalized', (req, res) => {
  res.json({ message: 'Consejos personalizados - Pendiente de implementar' });
});

module.exports = router;

