import { Stack } from "expo-router"

const DriversDashboardLayout = () => {
  return (
      <Stack>
          <Stack.Screen name="driver-dashboard" options={{ headerShown: false }}/>   
      </Stack> 
  )
}

export default DriversDashboardLayout