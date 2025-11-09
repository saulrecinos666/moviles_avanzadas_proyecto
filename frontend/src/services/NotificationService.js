import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
  }

  // Registrar el dispositivo para notificaciones push
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  // Programar notificación de medicamento
  async scheduleMedicationReminder(medication) {
    const { id, nombre, hora, dias, fechaInicio, fechaFin } = medication;
    
    // Calcular la próxima fecha de notificación
    const now = new Date();
    const [hours, minutes] = hora.split(':');
    const notificationTime = new Date();
    notificationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Si la hora ya pasó hoy, programar para mañana
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    // Verificar si el medicamento está activo
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    
    if (now < startDate || now > endDate) {
      return null;
    }

    // Verificar si hoy es un día válido para el medicamento
    const today = now.getDay();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = dayNames[today];
    
    if (!dias.includes(todayName)) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Recordatorio de Medicamento',
        body: `Es hora de tomar ${nombre}`,
        data: { 
          type: 'medication',
          medicationId: id,
          medicationName: nombre
        },
        sound: 'default',
      },
      trigger: {
        date: notificationTime,
        repeats: true,
      },
    });

    return notificationId;
  }

  // Programar notificación de ejercicio
  async scheduleExerciseReminder(exercise) {
    const { id, nombre, hora, fecha } = exercise;
    
    const notificationTime = new Date(`${fecha}T${hora}`);
    
    // Si la hora ya pasó, no programar
    if (notificationTime <= new Date()) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏃‍♂️ Recordatorio de Ejercicio',
        body: `Es hora de hacer ${nombre}`,
        data: { 
          type: 'exercise',
          exerciseId: id,
          exerciseName: nombre
        },
        sound: 'default',
      },
      trigger: {
        date: notificationTime,
      },
    });

    return notificationId;
  }

  // Programar notificación de hidratación
  async scheduleHydrationReminder() {
    const now = new Date();
    const nextReminder = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Cada 2 horas

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Recordatorio de Hidratación',
        body: '¡No olvides beber agua! Mantente hidratado.',
        data: { 
          type: 'hydration'
        },
        sound: 'default',
      },
      trigger: {
        date: nextReminder,
        repeats: true,
      },
    });

    return notificationId;
  }

  // Programar notificación de consejo diario
  async scheduleDailyTip() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9:00 AM

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Consejo del Día',
        body: 'Tienes un nuevo consejo de salud personalizado esperándote.',
        data: { 
          type: 'daily_tip'
        },
        sound: 'default',
      },
      trigger: {
        date: tomorrow,
        repeats: true,
      },
    });

    return notificationId;
  }

  // Programar notificación de progreso semanal
  async scheduleWeeklyProgress() {
    const now = new Date();
    const nextMonday = new Date(now);
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(10, 0, 0, 0); // 10:00 AM

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Resumen Semanal',
        body: 'Revisa tu progreso de esta semana y establece nuevos objetivos.',
        data: { 
          type: 'weekly_progress'
        },
        sound: 'default',
      },
      trigger: {
        date: nextMonday,
        repeats: true,
      },
    });

    return notificationId;
  }

  // Cancelar notificación específica
  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancelar todas las notificaciones
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Obtener notificaciones programadas
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Enviar notificación inmediata
  async sendImmediateNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Inmediata
    });
  }

  // Configurar notificaciones iniciales
  async setupInitialNotifications() {
    try {
      // Registrar para notificaciones push
      await this.registerForPushNotificationsAsync();
      
      // Programar notificaciones recurrentes
      await this.scheduleHydrationReminder();
      await this.scheduleDailyTip();
      await this.scheduleWeeklyProgress();
      
      console.log('Notificaciones iniciales configuradas correctamente');
    } catch (error) {
      console.error('Error configurando notificaciones:', error);
    }
  }

  // Programar recordatorios de medicamentos
  async scheduleMedicationReminders(medications) {
    const notificationIds = [];
    
    for (const medication of medications) {
      if (medication.activo) {
        const notificationId = await this.scheduleMedicationReminder(medication);
        if (notificationId) {
          notificationIds.push(notificationId);
        }
      }
    }
    
    return notificationIds;
  }

  // Programar recordatorios de ejercicios
  async scheduleExerciseReminders(exercises) {
    const notificationIds = [];
    
    for (const exercise of exercises) {
      const notificationId = await this.scheduleExerciseReminder(exercise);
      if (notificationId) {
        notificationIds.push(notificationId);
      }
    }
    
    return notificationIds;
  }

  // Programar notificación de consulta médica
  async scheduleConsultationReminder(consulta) {
    const { id, fecha, hora, medicoNombre, tipo } = consulta;
    
    // Crear fecha y hora de la consulta
    const consultaDateTime = new Date(`${fecha}T${hora}`);
    
    // Programar recordatorio 2 horas antes
    const reminderTime = new Date(consultaDateTime.getTime() - 2 * 60 * 60 * 1000);
    
    // Si el recordatorio ya pasó, no programar
    if (reminderTime <= new Date()) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Recordatorio de Consulta',
        body: `Tienes una consulta con ${medicoNombre} en ${reminderTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        data: { 
          type: 'consultation',
          consultaId: id,
          consultaFecha: fecha,
          consultaHora: hora,
          medicoNombre: medicoNombre,
          tipo: tipo
        },
        sound: 'default',
      },
      trigger: {
        date: reminderTime,
      },
    });

    return notificationId;
  }

  // Verificar si las notificaciones están habilitadas
  async areNotificationsEnabled() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error verificando permisos de notificaciones:', error);
      return false;
    }
  }

  // Habilitar/deshabilitar notificaciones según preferencias
  async updateNotificationSettings(enabled) {
    if (enabled) {
      return await this.registerForPushNotificationsAsync();
    } else {
      await this.cancelAllNotifications();
      return null;
    }
  }
}

export default new NotificationService();
