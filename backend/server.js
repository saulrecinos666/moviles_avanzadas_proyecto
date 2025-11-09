// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('cron');

//Servidor HTTP
const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

//Configuraciones
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Conectar a MongoDB (OPCIONAL - Comentado para usar solo SQLite)
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saludBienestar';
// mongoose.connect(MONGODB_URI)
//     .then(() => console.log("✅ Conexión a MongoDB Exitosa"))
//     .catch(err => console.error("❌ Error al conectar a MongoDB: ", err));

// Usando solo SQLite para almacenamiento local
console.log("✅ Modo SQLite activado - Base de datos local");

//Rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const activityRoutes = require('./routes/activity');
const exerciseRoutes = require('./routes/exercises');
const medicationRoutes = require('./routes/medications');
const progressRoutes = require('./routes/progress');
const forumRoutes = require('./routes/forum');
const adviceRoutes = require('./routes/advice');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/advice', adviceRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejo de rutas no encontradas (debe ir al final, después de todas las rutas)
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

//Configurar puerto para backend
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${port}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔗 Health check: http://localhost:${port}/api/health`);
});

// Tareas programadas
const dailyAdviceJob = new cron.CronJob('0 9 * * *', () => {
  console.log('📅 Ejecutando tarea diaria: Generar consejos personalizados');
  // Aquí se ejecutaría la lógica para generar consejos diarios
}, null, true, 'America/Mexico_City');

const weeklyReportJob = new cron.CronJob('0 10 * * 1', () => {
  console.log('📊 Ejecutando tarea semanal: Generar reportes de progreso');
  // Aquí se ejecutaría la lógica para generar reportes semanales
}, null, true, 'America/Mexico_City');

console.log('⏰ Tareas programadas iniciadas');