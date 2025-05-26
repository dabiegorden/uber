"use client"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"

import image4 from "@/assets/images/image4.png"

// Set the base URL for all fetch requests
const BASE_URL = "http://192.168.137.5:8080"

const LoginScreen = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Create a user data object to store in AsyncStorage
        const userData = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          role: data.user.role,
        }

        // If user is a driver and driverInfo is provided, store it as well
        if (data.user.role === "driver" && data.user.driverInfo) {
          userData.driverInfo = data.user.driverInfo
        }

        // Store user data in AsyncStorage for persistence
        await AsyncStorage.setItem("userData", JSON.stringify(userData))

        // Also store phone number in a separate field for easy access
        // For drivers, phone number is in driverInfo, for regular users it's in user data
        if (data.user.role === "driver" && data.user.driverInfo) {
          await AsyncStorage.setItem("userPhone", data.user.driverInfo.phone_number || "")
        } else {
          await AsyncStorage.setItem("userPhone", data.user.phone_number || "")
        }

        // Use the redirectRoute from the server response
        if (data.user.redirectRoute) {
          router.replace(data.user.redirectRoute)
        } else {
          // Fallback to role-based routing if redirectRoute is not provided
          if (data.user.role === "admin") {
            router.replace("/admin")
          } else if (data.user.role === "driver") {
            router.replace("/driver-dashboard")
          } else {
            router.replace("/map")
          }
        }
      } else {
        Alert.alert("Login Failed", data.message || "Unable to log in")
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert("Login Failed", "Unable to connect to server")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    router.push("/forgot-password")
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-10">
            <View className="items-center mb-8">
              <Image source={image4} className="w-48 h-32" resizeMode="contain" />
              <Text className="text-2xl font-bold mt-4 text-blue-600">Welcome Back</Text>
              <Text className="text-gray-500 mt-2">Log in to your account</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-2">
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
              />
            </View>

            <TouchableOpacity className="items-end mb-6" onPress={handleForgotPassword}>
              <Text className="text-blue-600">Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-4 items-center mb-6"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-lg">Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={() => router.push("/register")}>
              <Text className="text-blue-600">Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default LoginScreen
