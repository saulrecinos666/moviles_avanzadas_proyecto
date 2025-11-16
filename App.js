import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './frontend/src/context/UserContext';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './frontend/src/screens/LoginScreen';
import RegisterScreen from './frontend/src/screens/RegisterScreen';
import AppTabs from './AppNavigation';
import AgendarCitaScreen from './frontend/src/screens/AgendarCitaScreen';
import DetalleConsultaScreen from './frontend/src/screens/DetalleConsultaScreen';
import ProtectedRoute from './frontend/src/components/ProtectedRoute';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from './frontend/src/db/database';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const Stack = createNativeStackNavigator();

const clearCacheOnVersionUpdate = async () => {
  try {
    const currentVersion = Constants.expoConfig?.version || '3.0.0';
    const currentVersionCode = Constants.expoConfig?.android?.versionCode || 10;
    const storedVersion = await AsyncStorage.getItem('appVersion');
    const storedVersionCode = await AsyncStorage.getItem('appVersionCode');
    
    if (storedVersion !== currentVersion || storedVersionCode !== String(currentVersionCode)) {
      console.log('🔄 Nueva versión detectada. Limpiando cache...');
      
      const userData = await AsyncStorage.getItem('userData');
      await AsyncStorage.clear();
      
      if (userData) {
        await AsyncStorage.setItem('userData', userData);
      }
      
      await AsyncStorage.setItem('appVersion', currentVersion);
      await AsyncStorage.setItem('appVersionCode', String(currentVersionCode));
      
      console.log('✅ Cache limpiado para la nueva versión');
    }
  } catch (error) {
    console.error('Error al limpiar cache:', error);
  }
};

const ProtectedAgendarCita = ({ navigation, route }) => {
  return (
    <ProtectedRoute
      requiredRole="paciente"
      requiredAction="agendar_consulta"
      navigation={navigation}
    >
      <AgendarCitaScreen navigation={navigation} route={route} />
    </ProtectedRoute>
  );
};

const App = () => {
  useEffect(() => {
    clearCacheOnVersionUpdate();
    
    // Verificar y aplicar updates automáticamente
    const checkForUpdates = async () => {
      try {
        if (__DEV__) {
          // En desarrollo, no verificar updates
          return;
        }
        
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('🔄 Actualización disponible, descargando...');
          await Updates.fetchUpdateAsync();
          console.log('✅ Actualización descargada, reiniciando app...');
          await Updates.reloadAsync();
        } else {
          console.log('✅ App está actualizada');
        }
      } catch (error) {
        console.error('Error al verificar updates:', error);
      }
    };
    
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#2196F3" />
      <UserProvider>
        <SQLiteProvider databaseName='serviciosMedicos.db' onInit={ initializeDatabase } >
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName='Login'
              screenOptions={{
                headerShown: false
              }}
            >
              <Stack.Screen name='Login' component={LoginScreen} />
              <Stack.Screen name='Register' component={RegisterScreen} />
              <Stack.Screen name='Main' component={AppTabs} />
              <Stack.Screen 
                name='AgendarCita' 
                component={ProtectedAgendarCita}
                options={{
                  headerShown: true,
                  title: 'Agendar Consulta',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#FFFFFF'
                }}
              />
              <Stack.Screen 
                name='DetalleConsulta' 
                component={DetalleConsultaScreen}
                options={{
                  headerShown: true,
                  title: 'Detalle de Consulta',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#FFFFFF'
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SQLiteProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
};

export default App;