import { Stack } from "expo-router";

const MapLayout = () => {
  return(
    <Stack>
      <Stack.Screen name="map" options={{headerShown: false}} />
    </Stack>
  )
}

export default MapLayout