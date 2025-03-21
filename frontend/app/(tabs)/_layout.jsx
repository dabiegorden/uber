import React from 'react'
import { Stack } from "expo-router"

const TabsLayout = () => {
  return (
    <Stack>
       <Stack.Screen name="home" options={{headerShown: false}} />
       <Stack.Screen name="rides" options={{headerShown: false}} />
       <Stack.Screen name="accounts" options={{headerShown: false}} />
    </Stack>
  )
}

export default TabsLayout