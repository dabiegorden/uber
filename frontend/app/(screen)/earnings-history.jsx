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

const BASE_URL = "http://192.168.0.100:8080"

const RegisterScreen = () => {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)

  // New driver-specific state
  const [isDriver, setIsDriver] = useState(false)
  const [driverLicense, setDriverLicense] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleColor, setVehicleColor] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [vehicleImage, setVehicleImage] = useState(null)

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload a vehicle image.")
      return
    }

    // Launch image picker with updated API
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled) {
      setVehicleImage(result.assets[0])
    }
  }

  const handleRegister = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    // Additional driver validation if driver registration
    if (isDriver) {
      if (!driverLicense || !vehicleModel || !vehicleColor || !vehiclePlate) {
        Alert.alert("Error", "Please fill in all driver registration fields")
        return
      }

      if (!vehicleImage) {
        Alert.alert("Error", "Please upload a vehicle image")
        return
      }
    }

    try {
      setLoading(true)

      // Create form data for multipart/form-data request (for image upload)
      const formData = new FormData()
      formData.append("username", username)
      formData.append("email", email)
      formData.append("password", password)
      formData.append("phone_number", phoneNumber)
      formData.append("is_driver", isDriver ? "true" : "false")

      if (isDriver) {
        formData.append("driver_license", driverLicense)
        formData.append("vehicle_model", vehicleModel)
        formData.append("vehicle_color", vehicleColor)
        formData.append("vehicle_plate", vehiclePlate)
        formData.append("years_of_experience", yearsOfExperience)

        // Append vehicle image
        const imageUri = vehicleImage.uri
        const filename = imageUri.split("/").pop()
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : "image"

        formData.append("vehicleImage", {
          uri: imageUri,
          name: filename,
          type,
        })
      }

      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        Alert.alert(
          "Registration Successful",
          isDriver
            ? "Your driver account has been created. Pending verification."
            : "Your account has been created successfully. Please log in.",
          [
            {
              text: "OK",
              onPress: () => router.push("/login"),
            },
          ],
        )
      } else {
        Alert.alert("Registration Failed", data.message || "Registration failed")
      }
    } catch (error) {
      console.error("Registration error:", error)
      Alert.alert("Registration Failed", "Unable to connect to server")
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

            {/* Existing user fields */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">Register as Driver?</Text>
              <Switch value={isDriver} onValueChange={setIsDriver} />
            </View>

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
                placeholder="Create a password"
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

            {isDriver && (
              <>
                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Driver License *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={driverLicense}
                    onChangeText={setDriverLicense}
                    placeholder="Enter your driver license number"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Model *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder="Enter vehicle model"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Color *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                    placeholder="Enter vehicle color"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Plate *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder="Enter vehicle plate number"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Years of Experience</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-4 text-gray-700"
                    value={yearsOfExperience}
                    onChangeText={setYearsOfExperience}
                    placeholder="Enter years of driving experience"
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-700 mb-2 font-medium">Vehicle Image *</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-4 items-center justify-center"
                    style={{ height: 150 }}
                    onPress={pickImage}
                  >
                    {vehicleImage ? (
                      <Image
                        source={{ uri: vehicleImage.uri }}
                        style={{ width: "100%", height: "100%", borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center">
                        <Ionicons name="camera-outline" size={40} color="#999" />
                        <Text className="text-gray-500 mt-2">Tap to upload vehicle image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-4 items-center mb-6"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-lg">{isDriver ? "Register as Driver" : "Register"}</Text>
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
