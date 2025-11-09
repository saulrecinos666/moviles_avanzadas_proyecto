/**
 * Servicio de validaciones para formularios y datos
 */

// Validar campos requeridos
export const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') {
    return { valid: false, message: `${fieldName} es requerido` };
  }
  return { valid: true, message: '' };
};

// Validar longitud de texto
export const validateLength = (value, min, max, fieldName) => {
  if (value.length < min) {
    return { valid: false, message: `${fieldName} debe tener al menos ${min} caracteres` };
  }
  if (max && value.length > max) {
    return { valid: false, message: `${fieldName} no debe exceder ${max} caracteres` };
  }
  return { valid: true, message: '' };
};

// Validar fecha
export const validateDate = (date, fieldName) => {
  if (!date) {
    return { valid: false, message: `${fieldName} es requerido` };
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, message: `${fieldName} no es una fecha válida` };
  }
  return { valid: true, message: '' };
};

// Validar que la fecha no sea en el pasado (para citas)
export const validateFutureDate = (date, fieldName) => {
  const validation = validateDate(date, fieldName);
  if (!validation.valid) {
    return validation;
  }
  const dateObj = new Date(date);
  const now = new Date();
  if (dateObj <= now) {
    return { valid: false, message: `${fieldName} debe ser una fecha futura` };
  }
  return { valid: true, message: '' };
};

// Validar número
export const validateNumber = (value, fieldName, min = null, max = null) => {
  if (isNaN(value) || value === '' || value === null) {
    return { valid: false, message: `${fieldName} debe ser un número válido` };
  }
  const numValue = parseFloat(value);
  if (min !== null && numValue < min) {
    return { valid: false, message: `${fieldName} debe ser mayor o igual a ${min}` };
  }
  if (max !== null && numValue > max) {
    return { valid: false, message: `${fieldName} debe ser menor o igual a ${max}` };
  }
  return { valid: true, message: '' };
};

// Validar formato de hora (HH:MM)
export const validateTime = (time, fieldName) => {
  if (!time) {
    return { valid: false, message: `${fieldName} es requerido` };
  }
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { valid: false, message: `${fieldName} debe tener el formato HH:MM (24 horas)` };
  }
  return { valid: true, message: '' };
};

// Validar formulario completo
export const validateForm = (fields) => {
  const errors = {};
  let isValid = true;

  Object.keys(fields).forEach(key => {
    const field = fields[key];
    let validation = { valid: true, message: '' };

    // Validar requerido
    if (field.required) {
      validation = validateRequired(field.value, field.label);
      if (!validation.valid) {
        errors[key] = validation.message;
        isValid = false;
        return;
      }
    }

    // Validar tipo específico
    if (field.value && field.type) {
      switch (field.type) {
        case 'email':
          const emailValidation = require('./SecurityService').validateEmail(field.value);
          if (!emailValidation) {
            errors[key] = `${field.label} no es un email válido`;
            isValid = false;
          }
          break;
        case 'phone':
          const phoneValidation = require('./SecurityService').validatePhone(field.value);
          if (!phoneValidation) {
            errors[key] = `${field.label} no es un teléfono válido`;
            isValid = false;
          }
          break;
        case 'number':
          validation = validateNumber(field.value, field.label, field.min, field.max);
          if (!validation.valid) {
            errors[key] = validation.message;
            isValid = false;
          }
          break;
        case 'date':
          if (field.futureDate) {
            validation = validateFutureDate(field.value, field.label);
          } else {
            validation = validateDate(field.value, field.label);
          }
          if (!validation.valid) {
            errors[key] = validation.message;
            isValid = false;
          }
          break;
        case 'time':
          validation = validateTime(field.value, field.label);
          if (!validation.valid) {
            errors[key] = validation.message;
            isValid = false;
          }
          break;
        default:
          if (field.minLength || field.maxLength) {
            validation = validateLength(field.value, field.minLength || 0, field.maxLength, field.label);
            if (!validation.valid) {
              errors[key] = validation.message;
              isValid = false;
            }
          }
      }
    }
  });

  return { isValid, errors };
};

