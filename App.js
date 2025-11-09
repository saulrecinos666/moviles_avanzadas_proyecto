import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './frontend/src/context/UserContext';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './frontend/src/screens/LoginScreen';
import RegisterScreen from './frontend/src/screens/RegisterScreen';
import AppTabs from './AppNavigation';
import AgendarCitaScreen from './frontend/src/screens/AgendarCitaScreen';
//SQLProvider
import { SQLiteProvider } from 'expo-sqlite';
//InitializeDatabase
import { initializeDatabase } from './frontend/src/db/database';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
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
              component={AgendarCitaScreen}
              options={{
                headerShown: true,
                title: 'Agendar Consulta',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#FFFFFF'
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SQLiteProvider>
    </UserProvider>
  );
};

export default App;