import { Stack } from "expo-router"

const DriversDashboardLayout = () => {
  return (
      <Stack>
          <Stack.Screen name="driver-dashboard" options={{ headerShown: false }}/>   
          <Stack.Screen name="driver-details-screen" options={{ headerShown: false }}/>   
      </Stack> 
  )
}

export default DriversDashboardLayout