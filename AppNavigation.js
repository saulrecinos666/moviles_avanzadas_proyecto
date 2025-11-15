import { createDrawerNavigator } from "@react-navigation/drawer";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect } from 'react';
import { useUser } from './frontend/src/context/UserContext';
import RoleService from './frontend/src/services/RoleService';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadUserFromSQLite } from './frontend/src/db/userHelper';

// Importar las pantallas de servicios médicos
import DashboardScreen from "./frontend/src/screens/DashboardScreen";
import BusquedaMedicosScreen from "./frontend/src/screens/BusquedaMedicosScreen";
import ConsultasScreen from "./frontend/src/screens/ConsultasScreen";
import RecetasScreen from "./frontend/src/screens/RecetasScreen";
import HistorialMedicoScreen from "./frontend/src/screens/HistorialMedicoScreen";
import ChatScreen from "./frontend/src/screens/ChatScreen";
import MapaMedicosScreen from "./frontend/src/screens/MapaMedicosScreen";
import AgendarCitaScreen from "./frontend/src/screens/AgendarCitaScreen";
import PerfilScreen from "./frontend/src/screens/PerfilScreen";
import ForoScreen from "./frontend/src/screens/ForoScreen";

// Pantallas para médicos
import DashboardMedicoScreen from "./frontend/src/screens/medico/DashboardMedicoScreen";
import MisPacientesScreen from "./frontend/src/screens/medico/MisPacientesScreen";
import ConsultasMedicoScreen from "./frontend/src/screens/medico/ConsultasMedicoScreen";
import RecetasMedicoScreen from "./frontend/src/screens/medico/RecetasMedicoScreen";

// Pantallas para admin
import DashboardAdminScreen from "./frontend/src/screens/admin/DashboardAdminScreen";
import GestionUsuariosScreen from "./frontend/src/screens/admin/GestionUsuariosScreen";
import GestionMedicosScreen from "./frontend/src/screens/admin/GestionMedicosScreen";
import ReportesScreen from "./frontend/src/screens/admin/ReportesScreen";
import ConversacionesScreen from "./frontend/src/screens/ConversacionesScreen";
import DetalleConsultaScreen from "./frontend/src/screens/DetalleConsultaScreen";

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

const AppDrawer = () => {
  const { user } = useUser();
  const userRole = user?.rol || 'paciente';

  return (
    <Drawer.Navigator 
        initialRouteName={RoleService.isAdmin(userRole) ? "DashboardAdmin" : RoleService.isMedico(userRole) ? "DashboardMedico" : "Dashboard"} 
        screenOptions={{ 
            headerShown: true,
            headerStyle: { backgroundColor: '#2196F3' },
            headerTintColor: '#FFFFFF',
            drawerStyle: { backgroundColor: '#F5F5F5' },
            drawerActiveTintColor: '#2196F3',
            drawerInactiveTintColor: '#666666'
        }}
    >
        {/* Pantallas para Pacientes */}
        {RoleService.isPaciente(userRole) && (
          <>
            <Drawer.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{
                    title: 'Inicio',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="BusquedaMedicos" 
                component={BusquedaMedicosScreen}
                options={{
                    title: 'Buscar Médicos',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="doctor" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Consultas" 
                component={ConsultasScreen}
                options={{
                    title: 'Mis Consultas',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Recetas" 
                component={RecetasScreen}
                options={{
                    title: 'Recetas Electrónicas',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="file-document" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="HistorialMedico" 
                component={HistorialMedicoScreen}
                options={{
                    title: 'Historial Médico',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Conversaciones" 
                component={ConversacionesScreen}
                options={{
                    title: 'Mensajes',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="message-text" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="MapaMedicos" 
                component={MapaMedicosScreen}
                options={{
                    title: 'Médicos Cercanos',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="map" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Foro" 
                component={ForoScreen}
                options={{
                    title: 'Foro de Salud',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="forum" size={size} color={color} />
                    ),
                }}
            />
          </>
        )}

        {/* Pantallas para Médicos */}
        {RoleService.isMedico(userRole) && (
          <>
            <Drawer.Screen 
                name="DashboardMedico" 
                component={DashboardMedicoScreen}
                options={{
                    title: 'Dashboard Médico',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="MisPacientes" 
                component={MisPacientesScreen}
                options={{
                    title: 'Mis Pacientes',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="ConsultasMedico" 
                component={ConsultasMedicoScreen}
                options={{
                    title: 'Mis Consultas',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="RecetasMedico" 
                component={RecetasMedicoScreen}
                options={{
                    title: 'Recetas',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="file-document" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Conversaciones" 
                component={ConversacionesScreen}
                options={{
                    title: 'Mensajes',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="message-text" size={size} color={color} />
                    ),
                }}
            />
          </>
        )}

        {/* Pantallas para Admin */}
        {RoleService.isAdmin(userRole) && (
          <>
            <Drawer.Screen 
                name="DashboardAdmin" 
                component={DashboardAdminScreen}
                options={{
                    title: 'Dashboard Admin',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="GestionUsuarios" 
                component={GestionUsuariosScreen}
                options={{
                    title: 'Gestión de Usuarios',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="GestionMedicos" 
                component={GestionMedicosScreen}
                options={{
                    title: 'Gestión de Médicos',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="doctor" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen 
                name="Reportes" 
                component={ReportesScreen}
                options={{
                    title: 'Reportes',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                    ),
                }}
            />
          </>
        )}

        {/* Perfil - Todos los roles */}
        <Drawer.Screen 
            name="Perfil" 
            component={PerfilScreen}
            options={{
                title: 'Mi Perfil',
                drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="account" size={size} color={color} />
                ),
            }}
        />
    </Drawer.Navigator>
  );
};

const AppTabs = () => {
  const { user, reloadUser } = useUser();
  const db = useSQLiteContext();
  const userRole = user?.rol || 'paciente';

  // Sincronizar rol desde SQLite cuando la app carga
  useEffect(() => {
    const syncRoleFromSQLite = async () => {
      if (user?.id && db) {
        try {
          const sqliteUser = await loadUserFromSQLite(db, user.id);
          console.log('AppTabs - Sincronizando rol. SQLite:', sqliteUser?.rol, 'AsyncStorage:', user.rol);
          if (sqliteUser && sqliteUser.rol && sqliteUser.rol !== user.rol) {
            // Si el rol en SQLite es diferente, actualizar AsyncStorage
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
              const parsedData = JSON.parse(userData);
              parsedData.rol = sqliteUser.rol;
              await AsyncStorage.setItem('userData', JSON.stringify(parsedData));
              await reloadUser();
              console.log('AppTabs - Rol actualizado a:', sqliteUser.rol);
            }
          }
        } catch (error) {
          console.error('Error al sincronizar rol en AppTabs:', error);
        }
      }
    };
    
    if (user?.id) {
      syncRoleFromSQLite();
    }
  }, [user?.id, user?.rol, db, reloadUser]);

  return (
    <Tab.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#2196F3' },
      headerTintColor: '#FFFFFF',
      tabBarStyle: { 
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E0E0E0',
        borderTopWidth: 1,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60
      },
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }
    }}>
      {/* Tabs para Pacientes */}
      {RoleService.isPaciente(userRole) && (
        <>
          <Tab.Screen 
              name='Dashboard' 
              component={DashboardScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                  ),
                  title: 'Inicio'
              }}
          />
          <Tab.Screen 
              name='BusquedaMedicos' 
              component={BusquedaMedicosScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="doctor" size={size} color={color} />
                  ),
                  title: 'Médicos'
              }}
          />
          <Tab.Screen 
              name='Consultas' 
              component={ConsultasScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                  ),
                  title: 'Consultas'
              }}
          />
          <Tab.Screen 
              name='Recetas' 
              component={RecetasScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="file-document" size={size} color={color} />
                  ),
                  title: 'Recetas'
              }}
          />
          <Tab.Screen 
              name='Conversaciones' 
              component={ConversacionesScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="message-text" size={size} color={color} />
                  ),
                  title: 'Mensajes'
              }}
          />
          <Tab.Screen 
              name='MapaMedicos' 
              component={MapaMedicosScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="map" size={size} color={color} />
                  ),
                  title: 'Mapa'
              }}
          />
          {/* Pantalla oculta para DetalleConsulta */}
          <Tab.Screen 
              name='DetalleConsulta' 
              component={DetalleConsultaScreen} 
              options={{
                  tabBarButton: () => null,
                  tabBarItemStyle: { display: 'none', height: 0, width: 0 },
                  tabBarLabel: '',
                  headerShown: true,
                  title: 'Detalle de Consulta',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#FFFFFF'
              }}
              listeners={{
                  tabPress: (e) => {
                    e.preventDefault();
                  },
                }}
          />
        </>
      )}

      {/* Tabs para Médicos */}
      {RoleService.isMedico(userRole) && (
        <>
          <Tab.Screen 
              name='DashboardMedico' 
              component={DashboardMedicoScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                  ),
                  title: 'Inicio'
              }}
          />
          <Tab.Screen 
              name='MisPacientes' 
              component={MisPacientesScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="account-group" size={size} color={color} />
                  ),
                  title: 'Pacientes'
              }}
          />
          <Tab.Screen 
              name='ConsultasMedico' 
              component={ConsultasMedicoScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                  ),
                  title: 'Consultas'
              }}
          />
          <Tab.Screen 
              name='RecetasMedico' 
              component={RecetasMedicoScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="file-document" size={size} color={color} />
                  ),
                  title: 'Recetas'
              }}
          />
          <Tab.Screen 
              name='Conversaciones' 
              component={ConversacionesScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="message-text" size={size} color={color} />
                  ),
                  title: 'Mensajes'
              }}
          />
          {/* Pantalla oculta para DetalleConsulta */}
          <Tab.Screen 
              name='DetalleConsulta' 
              component={DetalleConsultaScreen} 
              options={{
                  tabBarButton: () => null,
                  tabBarItemStyle: { display: 'none', height: 0, width: 0 },
                  tabBarLabel: '',
                  headerShown: true,
                  title: 'Detalle de Consulta',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#FFFFFF'
              }}
              listeners={{
                  tabPress: (e) => {
                    e.preventDefault();
                  },
                }}
          />
        </>
      )}

      {/* Tabs para Admin */}
      {RoleService.isAdmin(userRole) && (
        <>
          <Tab.Screen 
              name='DashboardAdmin' 
              component={DashboardAdminScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                  ),
                  title: 'Inicio'
              }}
          />
          <Tab.Screen 
              name='GestionUsuarios' 
              component={GestionUsuariosScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="account-group" size={size} color={color} />
                  ),
                  title: 'Usuarios'
              }}
          />
          <Tab.Screen 
              name='GestionMedicos' 
              component={GestionMedicosScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="doctor" size={size} color={color} />
                  ),
                  title: 'Médicos'
              }}
          />
          <Tab.Screen 
              name='Reportes' 
              component={ReportesScreen} 
              options={{
                  tabBarIcon: ({color, size}) => (
                      <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                  ),
                  title: 'Reportes'
              }}
          />
        </>
      )}

      {/* Perfil - Todos los roles */}
      <Tab.Screen 
          name='Perfil' 
          component={PerfilScreen} 
          options={{
              tabBarIcon: ({color, size}) => (
                  <MaterialCommunityIcons name="account" size={size} color={color} />
              ),
              title: 'Perfil'
          }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;