# Configuración de Metro Bundler en Render

Este documento explica cómo configurar Metro Bundler en Render para que tu development build se conecte a un servidor remoto.

## Pasos para desplegar en Render

### 1. Crear cuenta en Render
- Ve a [render.com](https://render.com)
- Crea una cuenta o inicia sesión
- Conecta tu repositorio de GitHub

### 2. Crear nuevo servicio Web Service
- Click en "New +" → "Web Service"
- Conecta tu repositorio de GitHub
- Selecciona el repositorio `moviles_avanzadas_proyecto`

### 3. Configurar el servicio
- **Name**: `expo-metro-server` (o el nombre que prefieras)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run start:render`
- **Plan**: Starter (gratis) o cualquier plan que prefieras

### 4. Variables de entorno
No necesitas variables de entorno especiales, pero puedes agregar:
- `NODE_ENV=production`
- `PORT` (Render lo asigna automáticamente)

### 5. Desplegar
- Click en "Create Web Service"
- Render comenzará a construir y desplegar el servicio
- Espera a que termine (puede tardar varios minutos)

### 6. Obtener la URL del servidor
- Una vez desplegado, Render te dará una URL como: `https://expo-metro-server.onrender.com`
- Esta URL es la que usarás en tu development build

## Usar el servidor en tu Development Build

### 1. Generar Development Build
```powershell
eas build --platform android --profile development --clear-cache
```

### 2. Instalar la APK en tu teléfono

### 3. Conectar al servidor de Render
- Abre la app en tu teléfono
- En la pantalla de "Development Build", ingresa la URL de Render:
  ```
  https://expo-metro-server.onrender.com
  ```
- Click en "Connect"
- La app se conectará y cargará el código desde Render

## Actualizar código

Cada vez que hagas cambios:

1. **Haz commit y push a GitHub:**
   ```powershell
   git add .
   git commit -m "Descripción de cambios"
   git push
   ```

2. **Render detectará los cambios automáticamente** y reconstruirá el servicio

3. **En la app**, presiona "Reload" o reinicia la app para cargar los cambios

## Notas importantes

- ⚠️ **Render puede poner el servicio en "sleep"** después de 15 minutos de inactividad (plan gratuito)
- ⚠️ La primera carga puede ser lenta (cold start)
- ✅ Los cambios se reflejan automáticamente sin necesidad de reinstalar la APK
- ✅ Funciona desde cualquier lugar con internet

## Solución de problemas

### El servicio está en "sleep"
- Render despertará el servicio automáticamente cuando intentes conectarte
- Puede tardar 30-60 segundos en despertar

### No se conecta
- Verifica que la URL sea correcta (debe empezar con `https://`)
- Asegúrate de que el servicio esté "Live" en Render
- Verifica los logs en Render para ver errores

### Cambios no se reflejan
- Espera a que Render termine de reconstruir (verifica en el dashboard)
- Presiona "Reload" en la app
- Reinicia la app completamente

