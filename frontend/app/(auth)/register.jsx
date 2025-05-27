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
  Switch,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"

import image1 from "@/assets/images/image1.png"

const BASE_URL = "http://192.168.42.161:8080"

const RegisterScreen = () => {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)

  // Driver-specific state
  const [isDriver, setIsDriver] = useState(false)
  const [driverLicense, setDriverLicense] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleColor, setVehicleColor] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [vehicleImage, setVehicleImage] = useState(null)

  const pickVehicleImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to upload vehicle image!")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled) {
      setVehicleImage(result.assets[0])
    }
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    return password.length >= 6
  }

  const handleRegister = async () => {
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    if (!validatePassword(password)) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    // Driver-specific validation
    if (isDriver) {
      if (!driverLicense || !vehicleModel || !vehicleColor || !vehiclePlate) {
        Alert.alert("Error", "Please fill in all driver registration fields")
        return
      }

      if (yearsOfExperience && isNaN(Number.parseInt(yearsOfExperience))) {
        Alert.alert("Error", "Years of experience must be a valid number")
        return
      }
    }

    try {
      setLoading(true)

      // Use the correct endpoint based on user type
      const endpoint = isDriver ? `${BASE_URL}/api/auth/register/driver` : `${BASE_URL}/api/auth/register/user`

      let requestBody
      const headers = {}

      if (isDriver && vehicleImage) {
        // Use FormData for driver registration with image
        const formData = new FormData()
        formData.append("username", username)
        formData.append("email", email)
        formData.append("password", password)
        formData.append("phone_number", phoneNumber)
        formData.append("driver_license", driverLicense)
        formData.append("vehicle_model", vehicleModel)
        formData.append("vehicle_color", vehicleColor)
        formData.append("vehicle_plate", vehiclePlate)
        formData.append("years_of_experience", yearsOfExperience || "0")

        // Add vehicle image
        formData.append("vehicleImage", {
          uri: vehicleImage.uri,
          type: "image/jpeg",
          name: "vehicle-image.jpg",
        })

        requestBody = formData
      } else {
        // Use JSON for regular user registration or driver without image
        headers["Content-Type"] = "application/json"
        const jsonData = {
          username,
          email,
          password,
          phone_number: phoneNumber,
        }

        // Add driver-specific fields if registering as driver
        if (isDriver) {
          jsonData.driver_license = driverLicense
          jsonData.vehicle_model = vehicleModel
          jsonData.vehicle_color = vehicleColor
          jsonData.vehicle_plate = vehiclePlate
          jsonData.years_of_experience = yearsOfExperience || "0"
        }

        requestBody = JSON.stringify(jsonData)
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: requestBody,
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const successMessage = isDriver
          ? "Your driver account has been created successfully! Your account is pending verification. You'll be notified once approved."
          : "Your account has been created successfully! Please log in."

        Alert.alert("Registration Successful", successMessage, [
          {
            text: "OK",
            onPress: () => router.push("/login"),
          },
        ])
      } else {
        Alert.alert("Registration Failed", data.message || "Registration failed. Please try again.")
      }
    } catch (error) {
      console.error("Registration error:", error)
      Alert.alert("Registration Failed", "Unable to connect to server. Please check your internet connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-10">
            <View className="items-center mb-8">
              <Image source={image1} className="w-48 h-32" resizeMode="contain" />
              <Text className="text-2xl font-bold mt-4 text-blue-600">Create Account</Text>
              <Text className="text-gray-500 mt-2">Sign up to get started</Text>
            </View>

            {/* User Type Toggle */}
            <View className="mb-6 p-4 bg-gray-50 rounded-lg">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-gray-700 font-medium text-lg">Register as Driver?</Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {isDriver ? "You'll be able to accept ride requests" : "You'll be able to book rides"}
                  </Text>
                </View>
                <Switch
                  value={isDriver}
                  onValueChange={setIsDriver}
                  trackColor={{ false: "#767577", true: "#3B82F6" }}
                  thumbColor={isDriver ? "#ffffff" : "#f4f3f4"}
                />
              </View>
            </View>

            {/* Basic User Information */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Username *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Phone Number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number (optional)"
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Password *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 characters)"
                secureTextEntry
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Confirm Password *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
              />
            </View>

            {/* Driver-Specific Fields */}
            {isDriver && (
              <View className="mb-6 p-4 bg-blue-50 rounded-lg">
                <Text className="text-blue-700 font-bold text-lg mb-4">Driver Information</Text>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Driver License Number *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={driverLicense}
                    onChangeText={setDriverLicense}
                    placeholder="Enter your driver license number"
                    autoCapitalize="characters"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Model *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder="e.g., Toyota Camry, Honda Civic"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Color *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                    placeholder="e.g., Blue, Red, White"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Plate Number *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder="Enter vehicle plate number"
                    autoCapitalize="characters"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Years of Driving Experience</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={yearsOfExperience}
                    onChangeText={setYearsOfExperience}
                    placeholder="Enter years of experience (optional)"
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Image (Optional)</Text>
                  <TouchableOpacity
                    className="border border-dashed border-gray-400 rounded-lg p-4 items-center"
                    style={{ height: 150 }}
                    onPress={pickVehicleImage}
                  >
                    {vehicleImage ? (
                      <View className="items-center">
                        <Image source={{ uri: vehicleImage.uri }} className="w-20 h-20 rounded-lg mb-2" />
                        <Text className="text-green-600">Image selected</Text>
                      </View>
                    ) : (
                      <View className="items-center">
                        <Ionicons name="camera-outline" size={40} color="#999" />
                        <Text className="text-gray-500 mt-2">Tap to upload vehicle image</Text>
                        <Text className="text-gray-400 text-sm mt-1">Helps passengers identify your vehicle</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-4 items-center mb-6"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  {isDriver ? "Register as Driver" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={() => router.push("/login")}>
              <Text className="text-blue-600">Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default RegisterScreen
