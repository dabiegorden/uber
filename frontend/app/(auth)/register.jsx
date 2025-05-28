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
import Constants from "expo-constants"
import { __DEV__ } from "react-native"

// You'll need to add your image assets
import image1 from "@/assets/images/image1.png"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;

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
  const [location, setLocation] = useState("") // Added location field
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
      if (!driverLicense || !location || !vehicleModel || !vehicleColor || !vehiclePlate) {
        Alert.alert("Error", "Please fill in all required driver registration fields including location")
        return
      }

      if (yearsOfExperience && isNaN(Number.parseInt(yearsOfExperience))) {
        Alert.alert("Error", "Years of experience must be a valid number")
        return
      }
    }

    try {
      setLoading(true)
      console.log("Starting registration process...")

      // Use the correct endpoint based on user type
      const endpoint = isDriver ? `${BASE_URL}/api/auth/register/driver` : `${BASE_URL}/api/auth/register/user`

      let requestBody
      const headers = {}

      if (isDriver && vehicleImage) {
        // Use FormData for driver registration with image
        const formData = new FormData()
        formData.append("username", username.trim())
        formData.append("email", email.toLowerCase().trim())
        formData.append("password", password)
        formData.append("phone_number", phoneNumber.trim())
        formData.append("driver_license", driverLicense.trim())
        formData.append("location", location.trim()) // Added location field
        formData.append("vehicle_model", vehicleModel.trim())
        formData.append("vehicle_color", vehicleColor.trim())
        formData.append("vehicle_plate", vehiclePlate.trim())
        formData.append("years_of_experience", yearsOfExperience || "0")

        // Add vehicle image
        formData.append("vehicleImage", {
          uri: vehicleImage.uri,
          type: "image/jpeg",
          name: "vehicle-image.jpg",
        })

        requestBody = formData
        console.log("Using FormData for driver registration with image")
      } else {
        // Use JSON for regular user registration or driver without image
        headers["Content-Type"] = "application/json"
        const jsonData = {
          username: username.trim(),
          email: email.toLowerCase().trim(),
          password,
          phone_number: phoneNumber.trim(),
        }

        // Add driver-specific fields if registering as driver
        if (isDriver) {
          jsonData.driver_license = driverLicense.trim()
          jsonData.location = location.trim() // Added location field
          jsonData.vehicle_model = vehicleModel.trim()
          jsonData.vehicle_color = vehicleColor.trim()
          jsonData.vehicle_plate = vehiclePlate.trim()
          jsonData.years_of_experience = yearsOfExperience || "0"
        }

        requestBody = JSON.stringify(jsonData)
        console.log("Using JSON for registration:", jsonData)
      }

      console.log("Sending request to:", endpoint)

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: requestBody,
        credentials: "include",
      })

      const data = await response.json()
      console.log("Registration response:", data)

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
        console.error("Registration failed:", data)
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-10">
            <View className="items-center mb-8">
              {/* Replace with your actual image */}
              <View className="w-48 h-32 bg-blue-100 rounded-lg items-center justify-center mb-4">
                <Text className="text-blue-600 text-4xl font-bold">🚗</Text>
                <Text className="text-blue-600 font-bold">RideShare</Text>
              </View>
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
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Phone Number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number (optional)"
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Password *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 characters)"
                secureTextEntry
                editable={!loading}
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Confirm Password *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Driver-Specific Fields */}
            {isDriver && (
              <View className="mb-6 p-4 bg-blue-50 rounded-lg">
                <Text className="text-blue-700 font-bold text-lg mb-4">Driver Information</Text>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Driver License Number *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={driverLicense}
                    onChangeText={setDriverLicense}
                    placeholder="Enter your driver license number"
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>

                {/* NEW: Location Field */}
                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Location *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Enter your location (e.g., New York, NY)"
                    editable={!loading}
                  />
                  <Text className="text-gray-500 text-sm mt-1">This helps passengers find drivers in their area</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Model *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder="e.g., Toyota Camry, Honda Civic"
                    editable={!loading}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Color *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                    placeholder="e.g., Blue, Red, White"
                    editable={!loading}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Plate Number *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder="Enter vehicle plate number"
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Years of Driving Experience</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700 bg-white"
                    value={yearsOfExperience}
                    onChangeText={setYearsOfExperience}
                    placeholder="Enter years of experience (optional)"
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Image (Optional)</Text>
                  <TouchableOpacity
                    className="border border-dashed border-gray-400 rounded-lg p-4 items-center"
                    style={{ height: 150 }}
                    onPress={pickVehicleImage}
                    disabled={loading}
                  >
                    {vehicleImage ? (
                      <View className="items-center">
                        <Image source={{ uri: vehicleImage.uri }} className="w-20 h-20 rounded-lg mb-2" />
                        <Text className="text-green-600">Image selected</Text>
                        <Text className="text-gray-500 text-sm">{vehicleImage.fileName || "vehicle-image.jpg"}</Text>
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
              className={`rounded-lg py-4 items-center mb-6 ${loading ? "bg-blue-400" : "bg-blue-600"}`}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">
                    {isDriver ? "Registering Driver..." : "Creating Account..."}
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">
                  {isDriver ? "Register as Driver" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="items-center" onPress={() => router.push("/login")}>
              <Text className="text-blue-600">Already have an account? Log In</Text>
            </TouchableOpacity>

            {/* Development helper */}
            {__DEV__ && (
              <View className="mt-8 p-4 bg-gray-100 rounded-lg">
                <Text className="text-gray-600 text-sm font-medium mb-2">Development Mode</Text>
                <Text className="text-gray-500 text-xs mb-2">Base URL: {BASE_URL}</Text>
                <TouchableOpacity
                  className="bg-gray-300 py-2 px-4 rounded mb-2"
                  onPress={() => {
                    setUsername("testuser")
                    setEmail("user@test.com")
                    setPassword("password123")
                    setConfirmPassword("password123")
                    setPhoneNumber("1234567890")
                  }}
                >
                  <Text className="text-gray-700 text-sm">Fill User Test Data</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-300 py-2 px-4 rounded"
                  onPress={() => {
                    setIsDriver(true)
                    setUsername("testdriver")
                    setEmail("driver@test.com")
                    setPassword("password123")
                    setConfirmPassword("password123")
                    setPhoneNumber("1234567890")
                    setDriverLicense("DL123456789")
                    setLocation("New York, NY")
                    setVehicleModel("Toyota Camry")
                    setVehicleColor("Blue")
                    setVehiclePlate("ABC123")
                    setYearsOfExperience("5")
                  }}
                >
                  <Text className="text-gray-700 text-sm">Fill Driver Test Data</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default RegisterScreen
