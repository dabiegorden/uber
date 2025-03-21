import React from 'react'
import "../app/globals.css"
import { Stack } from "expo-router"

const RootLayout = () => {
  return (
    <Stack>
       <Stack.Screen name="index" options={{headerShown: false}} />
       <Stack.Screen name="(screen)" options={{headerShown: false}} />
       <Stack.Screen name="(auth)" options={{headerShown: false}} />
    </Stack>
  )
}

export default RootLayout