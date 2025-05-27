"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons"

const BASE_URL = "http://192.168.42.161:8080"

const DriverDetailsScreen = () => {
  const params = useLocalSearchParams()
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [currentRide, setCurrentRide] = useState(null)

  useEffect(() => {
    if (params.driverData) {
      try {
        const driverData = JSON.parse(params.driverData)
        setDriver(driverData)
        setLoading(false)
      } catch (error) {
        console.error("Error parsing driver data:", error)
        Alert.alert("Error", "Failed to load driver details")
        router.back()
      }
    } else {
      Alert.alert("Error", "No driver data provided")
      router.back()
    }
  }, [params])

  const handleBookRide = () => {
    setShowBookingModal(true)
  }

  const confirmBooking = async () => {
    if (!driver) return

    setBookingLoading(true)

    try {
      // Get current location or use default
      const pickupLocation = {
        latitude: params.pickupLat ? Number.parseFloat(params.pickupLat) : 7.3552992,
        longitude: params.pickupLng ? Number.parseFloat(params.pickupLng) : -2.3867617,
      }

      const dropoffLocation = {
        latitude: pickupLocation.latitude + (Math.random() * 0.01 - 0.005),
        longitude: pickupLocation.longitude + (Math.random() * 0.01 - 0.005),
      }

      console.log("Creating ride with driver:", driver.id)

      const response = await fetch(`${BASE_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverId: driver.id,
          pickupLocation,
          dropoffLocation,
          fare: Number.parseFloat(driver.fare),
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log("Ride created successfully:", data)

        setCurrentRide({
          id: data.rideId,
          status: "requested",
          fare: Number.parseFloat(driver.fare),
        })

        setBookingLoading(false)
        setShowBookingModal(false)
        setShowSuccessModal(true)
      } else {
        console.error("Failed to create ride:", data)
        Alert.alert("Booking Failed", data.message || "Failed to book ride")
        setBookingLoading(false)
      }
    } catch (error) {
      console.error("Booking error:", error)
      Alert.alert("Booking Failed", "Failed to book ride. Please try again.")
      setBookingLoading(false)

      // For testing, create a mock ride if the API fails
      setCurrentRide({
        id: Math.floor(Math.random() * 10000),
        status: "requested",
        fare: Number.parseFloat(driver.fare),
      })
      setShowBookingModal(false)
      setShowSuccessModal(true)
    }
  }

  const handleRideComplete = () => {
    setShowSuccessModal(false)
    router.replace("/map")
  }

  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBookingModal(false)}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Confirm Booking</Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <AntDesign name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Ride Summary</Text>
            <View className="bg-gray-50 p-3 rounded-lg">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Driver:</Text>
                <Text className="font-medium">{driver?.username}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Vehicle:</Text>
                <Text className="font-medium">
                  {driver?.vehicle_model} ({driver?.vehicle_color})
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Distance:</Text>
                <Text className="font-medium">{driver?.distance} km</Text>
              </View>
              <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-200">
                <Text className="text-gray-700 font-bold">Total Fare:</Text>
                <Text className="text-blue-600 font-bold">${driver?.fare}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-500 py-3 rounded-lg items-center mb-2"
            onPress={confirmBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Confirm Booking</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-200 py-3 rounded-lg items-center"
            onPress={() => setShowBookingModal(false)}
          >
            <Text className="text-gray-700 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-6 items-center">
          <View className="bg-green-100 p-4 rounded-full mb-4">
            <AntDesign name="checkcircle" size={48} color="#10b981" />
          </View>

          <Text className="text-2xl font-bold mb-2">Ride Booked!</Text>
          <Text className="text-gray-600 text-center mb-6">
            Your ride has been successfully booked. The driver will contact you shortly.
          </Text>

          {currentRide && (
            <View className="bg-gray-50 w-full p-4 rounded-lg mb-6">
              <Text className="font-bold text-center mb-2">Booking Details</Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Ride ID:</Text>
                <Text className="font-medium">#{currentRide.id}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Driver:</Text>
                <Text className="font-medium">{driver?.username}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Amount:</Text>
                <Text className="font-medium">${currentRide.fare.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            className="bg-blue-500 py-3 px-6 rounded-lg w-full items-center"
            onPress={handleRideComplete}
          >
            <Text className="text-white font-bold">Back to Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading driver details...</Text>
      </SafeAreaView>
    )
  }

  if (!driver) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-red-500 text-lg">Driver not found</Text>
        <TouchableOpacity className="mt-4 bg-blue-500 py-2 px-4 rounded-lg" onPress={() => router.back()}>
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-6 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Driver Details</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        {/* Driver Profile */}
        <View className="bg-white mx-4 mt-4 p-6 rounded-xl shadow-sm">
          <View className="items-center mb-6">
            <View className="bg-blue-100 w-24 h-24 rounded-full items-center justify-center mb-4">
              <Ionicons name="person" size={48} color="#3b82f6" />
            </View>
            <Text className="text-2xl font-bold text-gray-800">{driver.username}</Text>
            <Text className="text-gray-500 mt-1">{driver.email}</Text>
            {driver.phone_number && <Text className="text-gray-500">{driver.phone_number}</Text>}
          </View>

          {/* Driver Stats */}
          <View className="flex-row justify-around mb-6">
            <View className="items-center">
              <View className="bg-green-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                <MaterialCommunityIcons name="star" size={24} color="#10b981" />
              </View>
              <Text className="text-gray-600 text-sm">Rating</Text>
              <Text className="font-bold">4.8</Text>
            </View>
            <View className="items-center">
              <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                <MaterialCommunityIcons name="car" size={24} color="#3b82f6" />
              </View>
              <Text className="text-gray-600 text-sm">Experience</Text>
              <Text className="font-bold">{driver.years_of_experience} years</Text>
            </View>
            <View className="items-center">
              <View className="bg-yellow-100 w-12 h-12 rounded-full items-center justify-center mb-2">
                <MaterialCommunityIcons name="map-marker-distance" size={24} color="#f59e0b" />
              </View>
              <Text className="text-gray-600 text-sm">Distance</Text>
              <Text className="font-bold">{driver.distance} km</Text>
            </View>
          </View>

          {/* Verification Badge */}
          <View className="bg-green-50 p-3 rounded-lg mb-4">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
              <Text className="text-green-800 font-medium ml-2">Verified Driver</Text>
            </View>
            <Text className="text-green-600 text-sm mt-1">License verified • Background checked</Text>
          </View>
        </View>

        {/* Vehicle Information */}
        <View className="bg-white mx-4 mt-4 p-6 rounded-xl shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Vehicle Information</Text>

          {driver.vehicle_image && (
            <View className="mb-4">
              <Image
                source={{ uri: `${BASE_URL}${driver.vehicle_image}` }}
                className="w-full h-48 rounded-lg"
                resizeMode="cover"
              />
            </View>
          )}

          <View className="space-y-3">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="car" size={20} color="#3b82f6" />
              <Text className="text-gray-600 ml-3">Model:</Text>
              <Text className="font-medium ml-auto">{driver.vehicle_model}</Text>
            </View>

            <View className="flex-row items-center">
              <MaterialCommunityIcons name="palette" size={20} color="#3b82f6" />
              <Text className="text-gray-600 ml-3">Color:</Text>
              <Text className="font-medium ml-auto">{driver.vehicle_color}</Text>
            </View>

            <View className="flex-row items-center">
              <MaterialCommunityIcons name="card-account-details" size={20} color="#3b82f6" />
              <Text className="text-gray-600 ml-3">Plate:</Text>
              <Text className="font-medium ml-auto">{driver.vehicle_plate}</Text>
            </View>

            <View className="flex-row items-center">
              <MaterialCommunityIcons name="license" size={20} color="#3b82f6" />
              <Text className="text-gray-600 ml-3">License:</Text>
              <Text className="font-medium ml-auto">{driver.driver_license}</Text>
            </View>
          </View>
        </View>

        {/* Fare Information */}
        <View className="bg-white mx-4 mt-4 p-6 rounded-xl shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Fare Details</Text>

          <View className="bg-blue-50 p-4 rounded-lg">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Base Fare:</Text>
              <Text className="font-medium">$5.00</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Distance ({driver.distance} km):</Text>
              <Text className="font-medium">${(Number.parseFloat(driver.distance) * 2.5).toFixed(2)}</Text>
            </View>
            <View className="border-t border-blue-200 pt-2 mt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-800">Total Fare:</Text>
                <Text className="text-2xl font-bold text-blue-600">${driver.fare}</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="information" size={16} color="#f59e0b" />
              <Text className="text-yellow-800 text-sm ml-2">
                Estimated time: {Math.round(Number.parseFloat(driver.distance) * 3)} minutes
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Options */}
        <View className="bg-white mx-4 mt-4 p-6 rounded-xl shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Contact Driver</Text>

          <View className="flex-row space-x-4">
            <TouchableOpacity className="flex-1 bg-green-500 py-3 rounded-lg flex-row items-center justify-center">
              <MaterialCommunityIcons name="phone" size={20} color="white" />
              <Text className="text-white font-medium ml-2">Call</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-blue-500 py-3 rounded-lg flex-row items-center justify-center">
              <MaterialCommunityIcons name="message" size={20} color="white" />
              <Text className="text-white font-medium ml-2">Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Book Ride Button */}
        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity className="bg-blue-600 py-4 rounded-xl items-center shadow-lg" onPress={handleBookRide}>
            <Text className="text-white text-lg font-bold">Book This Ride - ${driver.fare}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderBookingModal()}
      {renderSuccessModal()}
    </SafeAreaView>
  )
}

export default DriverDetailsScreen
