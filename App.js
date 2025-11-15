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

const Stack = createNativeStackNavigator();

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