import { Stack } from "expo-router"

const ScreenLayout = () => {
  return (
      <Stack>
          <Stack.Screen name="driver-dashboard" options={{ headerShown: false }}/>  
          <Stack.Screen name="earnings-history" options={{ headerShown: false }}/> 
          <Stack.Screen name="update-vehicle" options={{ headerShown: false }}/> 
      </Stack> 
  )
}

export default ScreenLayout