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

const BASE_URL = "http://192.168.42.161:8080"

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

      if (response.ok && data.success) {
        // Store user data with userType instead of role
        const userData = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          userType: data.user.userType, // Updated to use userType from backend
        }

        await AsyncStorage.setItem("userData", JSON.stringify(userData))

        // Route based on userType
        switch (data.user.userType) {
          case "admin":
            router.replace("/admin")
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
              router.replace("/driver-dashboard")
            }
            break
          case "user":
          default:
            router.replace("/map")
            break
        }

        Alert.alert("Login Successful", `Welcome back, ${data.user.username}!`)
      } else {
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
                autoCorrect={false}
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

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-4 mt-4 items-center mb-6"
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
