import { View, Text } from 'react-native'
import React from 'react'
import "../app/globals.css"
import { Stack } from "expo-router"

const RootLayout = () => {
  return (
    <Stack>
       <Stack.Screen name="profile" options={{headerShown: false}} />
       <Stack.Screen name="index" options={{headerShown: false}} />
    </Stack>
  )
}

export default RootLayout