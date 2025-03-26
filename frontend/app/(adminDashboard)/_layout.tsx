import { Stack } from "expo-router";

const AdminLayout = () => {
  return(
    <Stack>
      <Stack.Screen name="admin" options={{headerShown: false}} />
    </Stack>
  )
}

export default AdminLayout