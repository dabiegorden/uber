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
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import { __DEV__ } from "react-native"

// You'll need to add your image assets
// import image4 from "@/assets/images/image4.png"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;

const LoginScreen = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    try {
      setLoading(true)
      console.log("Attempting login with:", { email: email.toLowerCase().trim() })

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
        credentials: "include",
      })

      const data = await response.json()
      console.log("Login response:", data)

      if (response.ok && data.success) {
        // Store user data - updated to match backend response structure
        const userData = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          userType: data.user.userType,
          // Store additional driver info if user is a driver
          ...(data.user.userType === "driver" && {
            license_verified: data.user.license_verified,
            available: data.user.available,
            location: data.user.location,
            vehicle_model: data.user.vehicle_model,
            vehicle_color: data.user.vehicle_color,
            vehicle_plate: data.user.vehicle_plate,
          }),
        }

        await AsyncStorage.setItem("userData", JSON.stringify(userData))
        console.log("User data stored:", userData)

        // Route based on userType with proper dashboard routing
        switch (data.user.userType) {
          case "admin":
            Alert.alert("Login Successful", `Welcome back, ${data.user.username}!`, [
              { text: "OK", onPress: () => router.replace("/admin") },
            ])
            break
          case "driver":
            // Check driver verification status
            if (data.user.license_verified === 0) {
              Alert.alert(
                "Account Pending Verification",
                "Your driver account is pending verification. You'll be notified once approved.",
                [{ text: "OK", onPress: () => router.replace("/driver-dashboard") }],
              )
            } else if (data.user.license_verified === 2) {
              Alert.alert(
                "Account Verification Failed",
                "Your driver account verification was rejected. Please contact support.",
                [{ text: "OK", onPress: () => router.replace("/driver-dashboard") }],
              )
            } else {
              Alert.alert("Login Successful", `Welcome back, ${data.user.username}!`, [
                { text: "OK", onPress: () => router.replace("/driver-dashboard") },
              ])
            }
            break
          case "user":
          default:
            Alert.alert("Login Successful", `Welcome back, ${data.user.username}!`, [
              { text: "OK", onPress: () => router.replace("/map") },
            ])
            break
        }
      } else {
        console.error("Login failed:", data)
        if (response.status === 401) {
          Alert.alert("Login Failed", "Invalid email or password. Please try again.")
        } else if (response.status === 403) {
          Alert.alert("Account Issue", data.message || "Your account has an issue. Please contact support.")
        } else {
          Alert.alert("Login Failed", data.message || "Unable to log in. Please try again.")
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert(
        "Connection Error",
        "Unable to connect to server. Please check your internet connection and try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "This feature will be implemented soon!")
    // router.push("/forgot-password")
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-10">
            <View className="items-center mb-8">
              {/* Replace with your actual image */}
              <View className="w-48 h-32 bg-blue-100 rounded-lg items-center justify-center mb-4">
                <Text className="text-blue-600 text-4xl font-bold">🚗</Text>
                <Text className="text-blue-600 font-bold">RideShare</Text>
              </View>
              <Text className="text-2xl font-bold mt-4 text-blue-600">Welcome Back</Text>
              <Text className="text-gray-500 mt-2">Log in to your account</Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View className="mb-2">
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity className="items-end mb-4" onPress={handleForgotPassword}>
              <Text className="text-blue-600 text-sm">Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-lg py-4 mt-4 items-center mb-6 ${loading ? "bg-blue-400" : "bg-blue-600"}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">Logging in...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={() => router.push("/register")}>
              <Text className="text-blue-600">Don't have an account? Sign Up</Text>
            </TouchableOpacity>

            {/* Development helper */}
            {__DEV__ && (
              <View className="mt-8 p-4 bg-gray-100 rounded-lg">
                <Text className="text-gray-600 text-sm font-medium mb-2">Development Mode</Text>
                <Text className="text-gray-500 text-xs">Base URL: {BASE_URL}</Text>
                <View className="flex-row flex-wrap mt-2">
                  <TouchableOpacity
                    className="bg-gray-300 py-2 px-4 rounded mr-2 mb-2"
                    onPress={() => {
                      setEmail("admin@test.com")
                      setPassword("password123")
                    }}
                  >
                    <Text className="text-gray-700 text-sm">Admin Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-300 py-2 px-4 rounded mr-2 mb-2"
                    onPress={() => {
                      setEmail("driver@test.com")
                      setPassword("password123")
                    }}
                  >
                    <Text className="text-gray-700 text-sm">Driver Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-300 py-2 px-4 rounded mb-2"
                    onPress={() => {
                      setEmail("user@test.com")
                      setPassword("password123")
                    }}
                  >
                    <Text className="text-gray-700 text-sm">User Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default LoginScreen
