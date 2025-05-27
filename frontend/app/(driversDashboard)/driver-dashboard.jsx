"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"

const BASE_URL = "http://192.168.42.161:8080"

const RideHistoryItem = ({ ride }) => {
  return (
    <View className="bg-white rounded-lg shadow-sm mb-3 p-4">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg">Ride #{ride.id}</Text>
          <Text className="text-gray-700 mt-1">
            <Text className="font-semibold">User:</Text> {ride.user_name || "Unknown"}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">{new Date(ride.created_at).toLocaleString()}</Text>
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
              className={`text-xs font-medium ${ride.payment_status === "paid" ? "text-green-800" : "text-yellow-800"}`}
            >
              {ride.payment_status ? ride.payment_status.toUpperCase() : "PENDING"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const DriverDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [driverProfile, setDriverProfile] = useState(null)
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
  })
  const [recentPayments, setRecentPayments] = useState([])
  const [isAvailable, setIsAvailable] = useState(false)
  const [recentRides, setRecentRides] = useState([])

  useEffect(() => {
    loadDriverData()
  }, [])

  const loadDriverData = async () => {
    try {
      setLoading(true)

      // Load driver profile
      const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!profileResponse.ok) {
        throw new Error("Failed to load driver profile")
      }

      const profileData = await profileResponse.json()

      if (profileData.success) {
        setDriverProfile(profileData.user)
        setIsAvailable(profileData.user.available === 1)
      }

      // Load earnings data
      const earningsResponse = await fetch(`${BASE_URL}/api/drivers/earnings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json()
        if (earningsData.success) {
          setEarnings(earningsData.earnings)
          setRecentPayments(earningsData.recentPayments)
        }
      }

      // Load recent rides data
      const ridesResponse = await fetch(`${BASE_URL}/api/drivers/recent-rides`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (ridesResponse.ok) {
        const ridesData = await ridesResponse.json()
        if (ridesData.success) {
          setRecentRides(ridesData.rides || [])
        }
      }
    } catch (error) {
      console.error("Error loading driver data:", error)
      if (error.message.includes("401")) {
        Alert.alert("Session Expired", "Please login again")
        router.replace("/login")
      } else {
        Alert.alert("Error", "Failed to load driver data. Please try again.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDriverData()
  }

  const toggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable

      const response = await fetch(`${BASE_URL}/api/drivers/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          available: newAvailability,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsAvailable(newAvailability)
        Alert.alert("Status Updated", `You are now ${newAvailability ? "available" : "unavailable"} for rides`)
      } else {
        Alert.alert("Update Failed", data.message || "Failed to update availability")
      }
    } catch (error) {
      console.error("Error updating availability:", error)
      Alert.alert("Error", "Failed to update availability. Please try again.")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "GET",
        credentials: "include",
      })

      await AsyncStorage.clear()
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Error", "Failed to logout. Please try again.")
    }
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading driver dashboard...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-6 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-2xl font-bold">Driver Dashboard</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center">
            <View className="bg-white rounded-full p-1 mr-4">
              <Ionicons name="person" size={40} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-white text-lg font-semibold">{driverProfile?.username || "Driver"}</Text>
              <Text className="text-white opacity-80">
                {driverProfile?.license_verified === 1 ? "Verified Driver" : "Pending Verification"}
              </Text>
            </View>
          </View>
        </View>

        {/* Availability Toggle */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className={`w-3 h-3 rounded-full mr-2 ${isAvailable ? "bg-green-500" : "bg-red-500"}`} />
              <Text className="text-gray-800 font-medium">Driver Status</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-2 text-gray-600">{isAvailable ? "Available" : "Unavailable"}</Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
                thumbColor={isAvailable ? "#3b82f6" : "#9ca3af"}
              />
            </View>
          </View>
        </View>

        {/* Vehicle Info */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-3">Vehicle Information</Text>

          <View className="flex-row mb-4">
            {driverProfile?.vehicle_image ? (
              <Image
                source={{ uri: `${BASE_URL}${driverProfile.vehicle_image}` }}
                className="w-24 h-24 rounded-lg mr-4"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 bg-gray-200 rounded-lg mr-4 items-center justify-center">
                <Ionicons name="car" size={32} color="#9ca3af" />
              </View>
            )}

            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="car" size={18} color="#3b82f6" className="mr-2" />
                <Text className="text-gray-800">{driverProfile?.vehicle_model || "N/A"}</Text>
              </View>

              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="palette" size={18} color="#3b82f6" className="mr-2" />
                <Text className="text-gray-800">{driverProfile?.vehicle_color || "N/A"}</Text>
              </View>

              <View className="flex-row items-center">
                <MaterialCommunityIcons name="card-account-details" size={18} color="#3b82f6" className="mr-2" />
                <Text className="text-gray-800">{driverProfile?.vehicle_plate || "N/A"}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-50 p-3 rounded-lg flex-row justify-center items-center"
            onPress={() => router.push("/update-vehicle")}
          >
            <Ionicons name="create-outline" size={18} color="#3b82f6" className="mr-2" />
            <Text className="text-blue-600 font-medium">Update Vehicle Info</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Summary */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-3">Earnings Summary</Text>

          <View className="flex-row flex-wrap">
            <View className="w-1/2 p-2">
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-gray-600 mb-1">Today</Text>
                <Text className="text-gray-900 font-bold text-xl">${earnings.today.toFixed(2)}</Text>
              </View>
            </View>

            <View className="w-1/2 p-2">
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-gray-600 mb-1">This Week</Text>
                <Text className="text-gray-900 font-bold text-xl">${earnings.thisWeek.toFixed(2)}</Text>
              </View>
            </View>

            <View className="w-1/2 p-2">
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-gray-600 mb-1">This Month</Text>
                <Text className="text-gray-900 font-bold text-xl">${earnings.thisMonth.toFixed(2)}</Text>
              </View>
            </View>

            <View className="w-1/2 p-2">
              <View className="bg-blue-50 p-3 rounded-lg">
                <Text className="text-gray-600 mb-1">Total Earnings</Text>
                <Text className="text-gray-900 font-bold text-xl">${earnings.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Payments */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-3">Recent Payments</Text>

          {recentPayments.length > 0 ? (
            recentPayments.map((payment, index) => (
              <View
                key={index}
                className={`flex-row justify-between items-center py-3 ${
                  index < recentPayments.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-row items-center">
                  <View className="bg-green-100 p-2 rounded-full mr-3">
                    <FontAwesome5 name="money-bill-wave" size={16} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-gray-800 font-medium">Ride Payment</Text>
                    <Text className="text-gray-500 text-sm">{formatDate(payment.created_at)}</Text>
                  </View>
                </View>
                <Text className="text-gray-900 font-bold">${Number.parseFloat(payment.amount).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <View className="py-6 items-center">
              <MaterialCommunityIcons name="cash-remove" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2">No recent payments</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-blue-50 mt-4 p-3 rounded-lg flex-row justify-center items-center"
            onPress={() => router.push("/earnings-history")}
          >
            <Ionicons name="stats-chart" size={18} color="#3b82f6" className="mr-2" />
            <Text className="text-blue-600 font-medium">View Full Earnings History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Rides */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-3">Recent Rides</Text>

          {recentRides.length > 0 ? (
            recentRides.map((ride) => <RideHistoryItem key={ride.id} ride={ride} />)
          ) : (
            <View className="py-6 items-center">
              <MaterialCommunityIcons name="car-off" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2">No recent rides</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-blue-50 mt-4 p-3 rounded-lg flex-row justify-center items-center"
            onPress={() => router.push("/ride-history")}
          >
            <Ionicons name="list" size={18} color="#3b82f6" className="mr-2" />
            <Text className="text-blue-600 font-medium">View All Rides</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default DriverDashboard
