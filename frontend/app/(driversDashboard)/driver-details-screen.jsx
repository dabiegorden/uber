"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons, MaterialCommunityIcons, AntDesign } from "@expo/vector-icons"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL

const DriverDetailsScreen = () => {
  const params = useLocalSearchParams()
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [currentRide, setCurrentRide] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentIntentId, setPaymentIntentId] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // FIXED: Remove params from dependency array to prevent infinite loop
  useEffect(() => {
    console.log("Driver details params received:", params)

    if (params.driverData) {
      try {
        const driverData = JSON.parse(params.driverData)
        console.log("Parsed driver data:", driverData)
        setDriver(driverData)
        setLoading(false)
      } catch (error) {
        console.error("Error parsing driver data:", error)
        Alert.alert("Error", "Failed to load driver details")
        router.back()
      }
    } else {
      console.error("No driver data provided in params")
      Alert.alert("Error", "No driver data provided")
      router.back()
    }
  }, []) // Empty dependency array - params won't change after initial load

  const handleBookRide = () => {
    console.log("Book ride button pressed for driver:", driver?.username)
    setShowBookingModal(true)
  }

  const confirmBooking = async () => {
    if (!driver) {
      Alert.alert("Error", "Driver information not available")
      return
    }

    setBookingLoading(true)

    try {
      // Step 1: Create the ride request first
      const pickupLat = params.pickupLat ? Number.parseFloat(params.pickupLat) : 7.3552992
      const pickupLng = params.pickupLng ? Number.parseFloat(params.pickupLng) : -2.3867617

      const rideRequestData = {
        driverId: driver.id,
        pickupLocation: `${pickupLat}, ${pickupLng}`,
        dropoffLocation: params.destination || driver.destination || "Current Location",
        fare: Number.parseFloat(driver.fare),
      }

      console.log("Creating ride with data:", rideRequestData)

      const rideResponse = await fetch(`${BASE_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rideRequestData),
        credentials: "include",
      })

      const rideData = await rideResponse.json()
      console.log("Ride request response:", rideData)

      if (!rideResponse.ok || !rideData.success) {
        throw new Error(rideData.message || "Failed to create ride")
      }

      const rideId = rideData.rideId

      // Step 2: Create payment intent
      console.log("Creating payment intent for ride:", rideId)

      const paymentResponse = await fetch(`${BASE_URL}/api/payments/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rideId: rideId,
          amount: Number.parseFloat(driver.fare),
        }),
        credentials: "include",
      })

      const paymentData = await paymentResponse.json()
      console.log("Payment intent response:", paymentData)

      if (!paymentResponse.ok || !paymentData.success) {
        throw new Error(paymentData.message || "Failed to create payment")
      }

      // Step 3: Simulate payment completion (in a real app, you'd use Stripe SDK)
      // For demo purposes, we'll simulate a successful payment
      console.log("Simulating payment completion...")

      // Extract payment intent ID from client secret
      const paymentIntentId = paymentData.clientSecret.split("_secret_")[0]

      // Step 4: Confirm payment on backend
      const confirmResponse = await fetch(`${BASE_URL}/api/payments/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rideId: rideId,
          paymentIntentId: paymentIntentId,
        }),
        credentials: "include",
      })

      const confirmData = await confirmResponse.json()
      console.log("Payment confirmation response:", confirmData)

      if (confirmResponse.ok && confirmData.success) {
        console.log("Payment completed successfully!")

        setCurrentRide({
          id: rideId,
          status: "completed",
          fare: Number.parseFloat(driver.fare),
          paymentStatus: "paid",
        })

        setBookingLoading(false)
        setShowBookingModal(false)
        setShowSuccessModal(true)
      } else {
        throw new Error(confirmData.message || "Payment confirmation failed")
      }
    } catch (error) {
      console.error("Booking/Payment error:", error)
      Alert.alert("Booking Failed", error.message || "Failed to complete booking and payment. Please try again.")
      setBookingLoading(false)
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
            <Text className="text-xl font-bold">Confirm Booking & Payment</Text>
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
                <Text className="text-gray-600">Location:</Text>
                <Text className="font-medium">{driver?.location || "Current area"}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Distance:</Text>
                <Text className="font-medium">{driver?.distance} km</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Destination:</Text>
                <Text className="font-medium">{params.destination || driver?.destination || "Current Location"}</Text>
              </View>
              <View className="border-t border-gray-200 pt-2 mt-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-bold">Total Amount:</Text>
                  <Text className="text-blue-600 font-bold">₵{driver?.fare}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="bg-yellow-50 p-3 rounded-lg mb-4">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="credit-card" size={16} color="#f59e0b" />
              <Text className="text-yellow-800 text-sm ml-2">Payment will be processed securely via Stripe</Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-500 py-3 rounded-lg items-center mb-2"
            onPress={confirmBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-bold ml-2">Processing Payment...</Text>
              </View>
            ) : (
              <Text className="text-white font-bold">Confirm & Pay ₵{driver?.fare}</Text>
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

          <Text className="text-2xl font-bold mb-2">🎉 Congratulations!</Text>
          <Text className="text-gray-600 text-center mb-6">
            Your ride has been successfully booked and paid for. The driver will contact you shortly.
          </Text>

          {currentRide && (
            <View className="bg-gray-50 w-full p-4 rounded-lg mb-6">
              <Text className="font-bold text-center mb-2">Booking & Payment Confirmation</Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Ride ID:</Text>
                <Text className="font-medium">#{currentRide.id}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Driver:</Text>
                <Text className="font-medium">{driver?.username}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Destination:</Text>
                <Text className="font-medium">{params.destination || driver?.destination || "Current Location"}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Amount Paid:</Text>
                <Text className="font-medium text-green-600">₵{currentRide.fare.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment Status:</Text>
                <Text className="font-medium text-green-600">✅ Paid</Text>
              </View>
            </View>
          )}

          <View className="bg-blue-50 w-full p-3 rounded-lg mb-4">
            <Text className="text-blue-800 text-sm text-center">
              💡 Your driver will arrive shortly. You can track your ride in the "My Rides" section.
            </Text>
          </View>

          <TouchableOpacity
            className="bg-blue-500 py-3 px-6 rounded-lg w-full items-center"
            onPress={handleRideComplete}
          >
            <Text className="text-white font-bold">Continue to Map</Text>
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
            {/* Display location */}
            {driver.location && <Text className="text-blue-600 mt-1">📍 {driver.location}</Text>}
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
              <Text className="font-bold">{driver.years_of_experience || 0} years</Text>
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
              <Text className="font-medium">₵5.00</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Distance ({driver.distance} km):</Text>
              <Text className="font-medium">₵{(Number.parseFloat(driver.distance) * 2.5).toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Destination:</Text>
              <Text className="font-medium">{params.destination || driver.destination || "Current Location"}</Text>
            </View>
            <View className="border-t border-blue-200 pt-2 mt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-800">Total Fare:</Text>
                <Text className="text-2xl font-bold text-blue-600">₵{driver.fare}</Text>
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

        {/* Book Ride Button */}
        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity className="bg-blue-600 py-4 rounded-xl items-center shadow-lg" onPress={handleBookRide}>
            <Text className="text-white text-lg font-bold">Book This Ride - ₵{driver.fare}</Text>
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
