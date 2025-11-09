import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { database, storage } from '../config/firebase';

/**
 * Servicio para manejo de recetas electrónicas
 */

// Generar número de receta único
export const generateRecetaNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `REC-${timestamp}-${random}`;
};

// Generar PDF de receta (simulado - en producción usaría una librería de PDF)
export const generateRecetaPDF = async (receta) => {
  try {
    // Esta es una implementación básica. En producción se usaría react-native-pdf o similar
    const pdfContent = `
RECETA MÉDICA ELECTRÓNICA
Número: ${receta.numeroReceta}
Fecha de Emisión: ${new Date(receta.fechaEmision).toLocaleDateString('es-ES')}
${receta.fechaVencimiento ? `Fecha de Vencimiento: ${new Date(receta.fechaVencimiento).toLocaleDateString('es-ES')}` : ''}

MÉDICO:
${receta.medicoNombre}
${receta.especialidad}

PACIENTE:
${receta.pacienteNombre}

DIAGNÓSTICO:
${receta.diagnostico || 'N/A'}

MEDICAMENTOS:
${receta.medicamentos}

INSTRUCCIONES:
${receta.instrucciones || 'Seguir indicaciones del médico'}

NOTAS:
${receta.notas || 'N/A'}
    `.trim();

    // Guardar como archivo temporal
    const fileName = `receta_${receta.numeroReceta}.txt`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, pdfContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  } catch (error) {
    console.error('Error generando PDF de receta:', error);
    throw error;
  }
};

// Compartir receta
export const shareReceta = async (receta) => {
  try {
    const pdfUri = await generateRecetaPDF(receta);
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Compartir Receta Médica',
      });
      return true;
    } else {
      console.log('Compartir no disponible en este dispositivo');
      return false;
    }
  } catch (error) {
    console.error('Error compartiendo receta:', error);
    throw error;
  }
};

// Guardar receta en Firebase Storage
export const saveRecetaToCloud = async (receta, pdfUri) => {
  try {
    const fileName = `recetas/${receta.pacienteId}/${receta.numeroReceta}.pdf`;
    const response = await fetch(pdfUri);
    const blob = await response.blob();
    
    const storageRef = storage.ref().child(fileName);
    await storageRef.put(blob);
    
    const downloadURL = await storageRef.getDownloadURL();
    return downloadURL;
  } catch (error) {
    console.error('Error guardando receta en la nube:', error);
    throw error;
  }
};

// Validar receta
export const validateReceta = (receta) => {
  const errors = [];

  if (!receta.numeroReceta || receta.numeroReceta.trim() === '') {
    errors.push('El número de receta es requerido');
  }

  if (!receta.medicamentos || receta.medicamentos.trim() === '') {
    errors.push('Los medicamentos son requeridos');
  }

  if (!receta.fechaEmision) {
    errors.push('La fecha de emisión es requerida');
  }

  if (!receta.medicoId) {
    errors.push('El médico es requerido');
  }

  if (!receta.pacienteId) {
    errors.push('El paciente es requerido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

