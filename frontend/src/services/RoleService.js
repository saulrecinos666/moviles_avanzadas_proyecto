// Servicio para manejar roles y permisos

export const ROLES = {
  PACIENTE: 'paciente',
  MEDICO: 'medico',
  ADMIN: 'admin'
};

// Permisos por rol
const PERMISSIONS = {
  [ROLES.PACIENTE]: {
    // Pantallas que puede ver
    screens: [
      'Dashboard',
      'BusquedaMedicos',
      'Consultas',
      'Recetas',
      'HistorialMedico',
      'Chat',
      'MapaMedicos',
      'Foro',
      'Perfil'
    ],
    // Acciones que puede realizar
    actions: [
      'ver_consultas_propias',
      'agendar_consulta',
      'ver_recetas_propias',
      'ver_historial_propio',
      'chatear_con_medicos',
      'buscar_medicos',
      'ver_foro',
      'participar_foro',
      'editar_perfil_propio'
    ]
  },
  [ROLES.MEDICO]: {
    screens: [
      'DashboardMedico',
      'MisPacientes',
      'ConsultasMedico',
      'RecetasMedico',
      'Chat',
      'AgendarCita',
      'Perfil'
    ],
    actions: [
      'ver_dashboard_medico',
      'ver_pacientes',
      'ver_consultas_asignadas',
      'crear_recetas',
      'ver_historial_pacientes',
      'chatear_con_pacientes',
      'agendar_citas',
      'gestionar_horarios',
      'editar_perfil_propio'
    ]
  },
  [ROLES.ADMIN]: {
    screens: [
      'DashboardAdmin',
      'GestionUsuarios',
      'GestionMedicos',
      'GestionConsultas',
      'GestionRecetas',
      'Reportes',
      'Configuracion',
      'Perfil'
    ],
    actions: [
      'ver_dashboard_admin',
      'gestionar_usuarios',
      'gestionar_medicos',
      'ver_todas_consultas',
      'ver_todas_recetas',
      'ver_reportes',
      'configurar_sistema',
      'editar_cualquier_perfil',
      'eliminar_usuarios',
      'asignar_roles'
    ]
  }
};

class RoleService {
  // Verificar si un usuario tiene acceso a una pantalla
  canAccessScreen(userRole, screenName) {
    if (!userRole || !PERMISSIONS[userRole]) {
      return false;
    }
    return PERMISSIONS[userRole].screens.includes(screenName);
  }

  // Verificar si un usuario puede realizar una acción
  canPerformAction(userRole, action) {
    if (!userRole || !PERMISSIONS[userRole]) {
      return false;
    }
    return PERMISSIONS[userRole].actions.includes(action);
  }

  // Obtener todas las pantallas permitidas para un rol
  getAllowedScreens(userRole) {
    if (!userRole || !PERMISSIONS[userRole]) {
      return [];
    }
    return PERMISSIONS[userRole].screens;
  }

  // Obtener todas las acciones permitidas para un rol
  getAllowedActions(userRole) {
    if (!userRole || !PERMISSIONS[userRole]) {
      return [];
    }
    return PERMISSIONS[userRole].actions;
  }

  // Verificar si es admin
  isAdmin(userRole) {
    return userRole === ROLES.ADMIN;
  }

  // Verificar si es médico
  isMedico(userRole) {
    return userRole === ROLES.MEDICO;
  }

  // Verificar si es paciente
  isPaciente(userRole) {
    return userRole === ROLES.PACIENTE;
  }

  // Obtener el nombre del rol en español
  getRoleName(userRole) {
    const roleNames = {
      [ROLES.PACIENTE]: 'Paciente',
      [ROLES.MEDICO]: 'Médico',
      [ROLES.ADMIN]: 'Administrador'
    };
    return roleNames[userRole] || 'Desconocido';
  }

  // Obtener el icono del rol
  getRoleIcon(userRole) {
    const roleIcons = {
      [ROLES.PACIENTE]: 'account',
      [ROLES.MEDICO]: 'doctor',
      [ROLES.ADMIN]: 'shield-account'
    };
    return roleIcons[userRole] || 'account';
  }
}

export default new RoleService();

