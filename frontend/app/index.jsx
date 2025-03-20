import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'

const Home = () => {
  return (
    <SafeAreaView className='flex justify-center items-center min-h-screen'>
      <Link href="/profile" className='text-2xl text-blue-600 underline'>Go to profile page</Link>
    </SafeAreaView>
  )
}

export default Home