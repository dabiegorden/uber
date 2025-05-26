"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"

const BASE_URL = "http://192.168.137.5:8080"

const UpdateVehicleScreen = () => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleColor, setVehicleColor] = useState("")
  const [vehiclePlate, setVehiclePlate] = useState("")
  const [vehicleImage, setVehicleImage] = useState(null)
  const [currentImageUrl, setCurrentImageUrl] = useState(null)

  useEffect(() => {
    loadDriverProfile()
  }, [])

  const loadDriverProfile = async () => {
    try {
      setLoading(true)

      const response = await fetch(`${BASE_URL}/api/auth/driver-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to load driver profile")
      }

      const data = await response.json()

      if (data.success) {
        const driver = data.driver
        setVehicleModel(driver.vehicle_model || "")
        setVehicleColor(driver.vehicle_color || "")
        setVehiclePlate(driver.vehicle_plate || "")

        if (driver.vehicle_image) {
          setCurrentImageUrl(`${BASE_URL}${driver.vehicle_image}`)
        }
      }
    } catch (error) {
      console.error("Error loading driver profile:", error)
      Alert.alert("Error", "Failed to load driver profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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

  const handleUpdate = async () => {
    // Validation
    if (!vehicleModel || !vehicleColor || !vehiclePlate) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    try {
      setSubmitting(true)

      // Create form data for multipart/form-data request (for image upload)
      const formData = new FormData()
      formData.append("vehicle_model", vehicleModel)
      formData.append("vehicle_color", vehicleColor)
      formData.append("vehicle_plate", vehiclePlate)

      // Append vehicle image if selected
      if (vehicleImage) {
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

      const response = await fetch(`${BASE_URL}/api/drivers/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        Alert.alert("Update Successful", "Your vehicle information has been updated successfully.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ])
      } else {
        Alert.alert("Update Failed", data.message || "Failed to update vehicle information")
      }
    } catch (error) {
      console.error("Update error:", error)
      Alert.alert("Update Failed", "Unable to connect to server")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading vehicle information...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 py-8">
            <View className="flex-row items-center mb-6">
              <TouchableOpacity className="mr-4" onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-800">Update Vehicle</Text>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Vehicle Image</Text>
              <TouchableOpacity
                className="border border-gray-300 rounded-lg items-center justify-center"
                style={{ height: 200 }}
                onPress={pickImage}
              >
                {vehicleImage ? (
                  <Image
                    source={{ uri: vehicleImage.uri }}
                    style={{ width: "100%", height: "100%", borderRadius: 8 }}
                    resizeMode="cover"
                  />
                ) : currentImageUrl ? (
                  <Image
                    source={{ uri: currentImageUrl }}
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
              <Text className="text-gray-500 text-xs mt-1">Tap to change image</Text>
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

            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Vehicle Plate *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-gray-700"
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                placeholder="Enter vehicle plate number"
              />
            </View>

            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-4 items-center mb-6"
              onPress={handleUpdate}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-lg">Update Vehicle Information</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default UpdateVehicleScreen
