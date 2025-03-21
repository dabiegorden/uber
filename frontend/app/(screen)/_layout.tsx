import { Stack } from "expo-router"

const ScreenLayout = () => {
  return (
      <Stack>
          <Stack.Screen name="ride-booking" options={{ headerShown: false }}/>  
          <Stack.Screen name="ride-tracking" options={{ headerShown: false }}/> 
      </Stack> 
  )
}

export default ScreenLayout