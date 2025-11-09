# Aplicación de Servicios Médicos a Distancia

Una aplicación móvil completa diseñada para ofrecer servicios médicos a distancia, permitiendo a los usuarios acceder a consultas virtuales, recetas electrónicas, historial médico digital y comunicación en tiempo real con médicos y especialistas.

## 🚀 Características Principales

### 📱 Funcionalidades del Usuario
- **Autenticación Segura**: Registro e inicio de sesión con Firebase, encriptación de datos sensibles
- **Perfil de Usuario**: Gestión completa de datos personales y médicos
- **Dashboard Intuitivo**: Resumen de consultas, recetas y mensajes

### 🏥 Servicios Médicos
- **Búsqueda de Médicos**: Filtros por especialidad, ubicación, disponibilidad e idioma
- **Programación de Citas**: Agendamiento de consultas virtuales con médicos
- **Consultas Médicas**: Gestión completa de citas programadas, completadas y canceladas
- **Recetas Electrónicas**: Visualización, descarga y compartir recetas con farmacias
- **Historial Médico Digital**: Almacenamiento de registros de consultas, recetas y resultados de pruebas

### 💬 Comunicación
- **Chat en Tiempo Real**: Comunicación instantánea con médicos y especialistas
- **Notificaciones Push**: Alertas para mensajes y recordatorios de citas
- **Sincronización en Tiempo Real**: Firebase Realtime Database para mensajes

### 🗺️ Integración con Maps
- **Google Maps**: Visualización de médicos y centros médicos cercanos
- **Geolocalización**: Búsqueda de médicos por ubicación
- **Navegación**: Direcciones a centros médicos

### 👥 Comunidad
- **Foro de Salud**: Espacio para compartir experiencias y recibir apoyo
- **Sistema de Calificaciones**: Evaluación de médicos y consultas

## 🛠️ Tecnologías Utilizadas

### Frontend (React Native + Expo)
- **React Native**: Framework principal
- **Expo**: Herramientas de desarrollo y despliegue
- **React Navigation**: Navegación entre pantallas (Drawer y Tabs)
- **Firebase**: 
  - Authentication (autenticación de usuarios)
  - Realtime Database (chat en tiempo real)
  - Firestore (sincronización de datos)
  - Storage (archivos médicos)
- **SQLite (expo-sqlite)**: Base de datos local para almacenamiento offline
- **React Native Maps**: Integración con Google Maps
- **Expo Location**: Geolocalización y permisos
- **Expo Notifications**: Sistema de notificaciones push
- **React Native Chart Kit**: Visualización de datos médicos

### Seguridad
- **Expo Secure Store**: Almacenamiento seguro de datos sensibles
- **Expo Crypto**: Encriptación de datos
- **Validación de Entrada**: Sanitización contra inyección SQL
- **Autenticación Firebase**: Contraseñas cifradas

## 📦 Instalación

### Prerrequisitos
- Node.js (v16 o superior)
- npm o yarn
- Expo CLI
- Cuenta de Firebase con Realtime Database habilitado
- Google Maps API Key (para funcionalidad de mapas)

### 1. Instalar Dependencias
```bash
cd SistemaServicioMedico
npm install
```

### 2. Configurar Firebase

Editar `frontend/src/config/firebase.js` con tus credenciales de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com"
};
```

**Configuración necesaria en Firebase Console:**
1. Habilitar Authentication con Email/Password
2. Crear Realtime Database
3. Configurar Firestore Database
4. Configurar Storage para archivos médicos
5. Configurar reglas de seguridad

### 3. Configurar Google Maps

Agregar tu API Key de Google Maps en `app.json`:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "TU_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

### 4. Iniciar la Aplicación
```bash
npm start
# o
expo start
```

## 🏗️ Estructura del Proyecto

```
SistemaServicioMedico/
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js          # Configuración Firebase
│   │   ├── context/
│   │   │   └── UserContext.js        # Contexto de usuario
│   │   ├── db/
│   │   │   └── database.js          # Esquema SQLite
│   │   ├── screens/
│   │   │   ├── DashboardScreen.js           # Dashboard principal
│   │   │   ├── BusquedaMedicosScreen.js     # Búsqueda de médicos
│   │   │   ├── ConsultasScreen.js           # Gestión de consultas
│   │   │   ├── RecetasScreen.js             # Recetas electrónicas
│   │   │   ├── HistorialMedicoScreen.js     # Historial médico
│   │   │   ├── ChatScreen.js                # Chat con médicos
│   │   │   ├── MapaMedicosScreen.js         # Mapa de médicos
│   │   │   ├── AgendarCitaScreen.js         # Agendar citas
│   │   │   ├── PerfilScreen.js              # Perfil de usuario
│   │   │   ├── ForoScreen.js                # Foro de salud
│   │   │   ├── LoginScreen.js               # Login
│   │   │   └── RegisterScreen.js            # Registro
│   │   └── services/
│   │       ├── SecurityService.js            # Encriptación y seguridad
│   │       ├── ValidationService.js          # Validaciones
│   │       ├── RecetaService.js               # Servicios de recetas
│   │       └── NotificationService.js         # Notificaciones
│   ├── App.js
│   ├── AppNavigation.js
│   └── package.json
├── backend/
│   └── ...
└── README.md
```

## 📊 Base de Datos SQLite

### Tablas Principales
- **usuarios**: Datos de pacientes
- **medicos**: Información de médicos y especialistas
- **consultas**: Citas médicas programadas
- **recetas**: Recetas electrónicas
- **historialMedico**: Historial completo del paciente
- **resultadosPruebas**: Resultados de pruebas médicas
- **mensajesChat**: Mensajes de chat
- **conversaciones**: Conversaciones activas
- **horariosMedicos**: Horarios de disponibilidad
- **medicosFavoritos**: Médicos favoritos del paciente
- **foroPosts**: Posts del foro
- **notificaciones**: Notificaciones del sistema

## 🔧 Funcionalidades Técnicas

### Validaciones
- Validación de formularios en todas las pantallas
- Validación de email, teléfono, fechas, horas
- Sanitización de entrada contra inyección SQL
- Alertas y mensajes de error claros

### Seguridad
- **Encriptación de Datos**: Protección de información médica sensible
- **Autenticación Segura**: Firebase Auth con contraseñas cifradas
- **Almacenamiento Seguro**: Expo Secure Store para datos sensibles
- **Prevención de Ataques**: Sanitización de inputs, validación de datos

### Rendimiento
- **Almacenamiento Local**: SQLite para funcionamiento offline
- **Sincronización en Tiempo Real**: Firebase para datos en la nube
- **Caché Inteligente**: Optimización de carga de datos
- **Lazy Loading**: Carga diferida de componentes

### Interfaz
- **Diseño Intuitivo**: Interfaz amigable para todas las edades
- **Responsive**: Adaptación a diferentes tamaños de pantalla
- **Accesibilidad**: Diseño accesible para usuarios con diferentes habilidades

## 📱 Pantallas Principales

### 1. Dashboard
- Resumen de consultas programadas y completadas
- Próxima consulta
- Accesos rápidos a funcionalidades principales
- Estadísticas de recetas y mensajes

### 2. Búsqueda de Médicos
- Filtros por especialidad, idioma, ubicación
- Ordenamiento por calificación, precio o nombre
- Visualización de información detallada de médicos

### 3. Consultas Médicas
- Lista de consultas programadas, completadas y canceladas
- Detalles de cada consulta
- Calificación de consultas
- Acceso a recetas relacionadas

### 4. Recetas Electrónicas
- Visualización de recetas activas y vencidas
- Compartir recetas con farmacias
- Descarga de PDF
- Historial completo de recetas

### 5. Historial Médico
- Registros de consultas, pruebas y diagnósticos
- Filtros por tipo de registro
- Archivos adjuntos
- Búsqueda en historial

### 6. Chat con Médicos
- Mensajería en tiempo real
- Sincronización con Firebase
- Notificaciones de mensajes nuevos
- Historial de conversaciones

### 7. Mapa de Médicos
- Visualización de médicos cercanos
- Geolocalización del usuario
- Navegación a centros médicos
- Información de contacto

### 8. Foro de Salud
- Comunidad de usuarios
- Compartir experiencias
- Categorías de discusión
- Sistema de likes y respuestas

## 🔐 Seguridad y Cumplimiento

### Normativa Médica
- Cumplimiento de regulaciones en telemedicina
- Protección de datos sensibles (HIPAA-like)
- Encriptación de información médica
- Acceso controlado por roles

### Medidas de Seguridad
- Autenticación con Firebase (contraseñas cifradas)
- Encriptación de datos sensibles en SQLite
- Protección contra inyección SQL
- Validación y sanitización de todos los inputs
- Almacenamiento seguro de tokens y credenciales

## 🚀 Despliegue

### Frontend (Expo)
```bash
# Build para Android
expo build:android

# Build para iOS
expo build:ios

# EAS Build (recomendado)
eas build --platform android
eas build --platform ios
```

## 📝 Notas Importantes

1. **Configuración de Firebase**: Es necesario configurar correctamente Firebase Realtime Database para el chat
2. **Google Maps API**: Se requiere una API Key válida de Google Maps
3. **Permisos**: La aplicación requiere permisos de ubicación para el mapa
4. **Notificaciones**: Configurar Firebase Cloud Messaging para notificaciones push

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Sistema de Servicios Médicos a Distancia** - *Desarrollo completo*

## 🙏 Agradecimientos

- React Native Community
- Expo Team
- Firebase Team
- Google Maps API
- Todos los contribuidores de las librerías utilizadas

## 📞 Soporte

Para soporte técnico o preguntas, contacta a través de GitHub Issues.

---

**¡Atención médica de calidad, desde la comodidad de tu hogar! 🏥💚**
