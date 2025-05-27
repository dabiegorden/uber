"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

const BASE_URL = "http://192.168.42.161:8080"

const RideHistoryScreen = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rides, setRides] = useState([])
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    loadRideHistory()
  }, [])

  const loadRideHistory = async () => {
    try {
      setLoading(true)

      // Get user profile to determine user type
      const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        if (profileData.success) {
          setUserType(profileData.user.userType)
        }
      }

      // Load ride history - handle case where endpoint might not exist or return empty
      try {
        const ridesResponse = await fetch(`${BASE_URL}/api/rides/history?limit=50`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (ridesResponse.ok) {
          const ridesData = await ridesResponse.json()
          if (ridesData.success) {
            setRides(ridesData.rides || [])
          } else {
            // If the API returns success: false, just set empty rides
            console.log("No rides found or API returned success: false")
            setRides([])
          }
        } else if (ridesResponse.status === 404) {
          // Endpoint doesn't exist yet, just show empty state
          console.log("Ride history endpoint not found, showing empty state")
          setRides([])
        } else {
          throw new Error(`HTTP ${ridesResponse.status}`)
        }
      } catch (rideError) {
        console.log("Ride history API error:", rideError.message)
        // Don't throw error, just show empty state
        setRides([])
      }
    } catch (error) {
      console.error("Error loading ride history:", error)
      if (error.message.includes("401")) {
        Alert.alert("Session Expired", "Please login again")
        router.replace("/login")
      } else {
        // Don't show error for missing rides, just show empty state
        console.log("Setting empty rides due to error:", error.message)
        setRides([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadRideHistory()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderRideItem = (ride) => {
    const isDriver = userType === "driver"
    const otherPersonName = isDriver ? ride.rider_name : ride.driver_name

    return (
      <View key={ride.id} className="bg-white rounded-lg shadow-sm mb-3 p-4">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="font-bold text-lg">Ride #{ride.id}</Text>
            <Text className="text-gray-700 mt-1">
              <Text className="font-semibold">{isDriver ? "Rider" : "Driver"}:</Text> {otherPersonName || "Unknown"}
            </Text>
            {!isDriver && ride.vehicle_model && (
              <Text className="text-gray-700">
                <Text className="font-semibold">Vehicle:</Text> {ride.vehicle_model} ({ride.vehicle_color})
              </Text>
            )}
            <Text className="text-gray-500 text-sm mt-1">{formatDate(ride.created_at)}</Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-lg">${Number.parseFloat(ride.fare || 0).toFixed(2)}</Text>
            <View
              className={`px-3 py-1 rounded-full mt-1 ${
                ride.status === "completed"
                  ? "bg-green-100"
                  : ride.status === "cancelled"
                    ? "bg-red-100"
                    : "bg-yellow-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  ride.status === "completed"
                    ? "text-green-800"
                    : ride.status === "cancelled"
                      ? "text-red-800"
                      : "text-yellow-800"
                }`}
              >
                {ride.status?.toUpperCase() || "PENDING"}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full mt-1 ${
                ride.payment_status === "paid" ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  ride.payment_status === "paid" ? "text-green-800" : "text-yellow-800"
                }`}
              >
                {ride.payment_status ? ride.payment_status.toUpperCase() : "PENDING"}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row">
            <View className="w-1/2">
              <Text className="text-gray-500 text-xs">PICKUP</Text>
              <Text className="text-gray-700">
                {`${Number.parseFloat(ride.pickup_latitude || 0).toFixed(4)}, ${Number.parseFloat(
                  ride.pickup_longitude || 0,
                ).toFixed(4)}`}
              </Text>
            </View>
            <View className="w-1/2">
              <Text className="text-gray-500 text-xs">DROPOFF</Text>
              <Text className="text-gray-700">
                {`${Number.parseFloat(ride.dropoff_latitude || 0).toFixed(4)}, ${Number.parseFloat(
                  ride.dropoff_longitude || 0,
                ).toFixed(4)}`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading ride history...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-6 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Ride History</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        {/* Ride History */}
        <View className="px-4 py-6">
          <Text className="text-xl font-bold mb-4">Your Rides</Text>

          {rides.length > 0 ? (
            rides.map((ride) => renderRideItem(ride))
          ) : (
            <View className="bg-white rounded-lg shadow-sm p-8 items-center">
              <MaterialCommunityIcons name="car-off" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4 text-lg">No rides found</Text>
              <Text className="text-gray-400 text-center mt-2">
                {userType === "driver"
                  ? "Start accepting rides to see your history here"
                  : "Book your first ride to see your history here"}
              </Text>
              <TouchableOpacity className="bg-blue-500 py-3 px-6 rounded-lg mt-4" onPress={() => router.push("/map")}>
                <Text className="text-white font-bold">
                  {userType === "driver" ? "Go to Dashboard" : "Book a Ride"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default RideHistoryScreen
