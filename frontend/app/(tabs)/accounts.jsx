"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"

const BASE_URL = "http://192.168.42.161:8080"

export default function AccountScreen() {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profile data")
      }

      const data = await response.json()

      if (data.success) {
        setUserData(data.user)
      } else {
        throw new Error(data.message || "Failed to fetch profile")
      }
    } catch (err) {
      console.error("Error fetching user data:", err)
      setError(err.message)

      if (err.message.includes("401") || err.message.includes("fetch")) {
        Alert.alert("Session Expired", "Please login again", [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        await AsyncStorage.clear()
        router.replace("/login")
      } else {
        Alert.alert("Logout Failed", "Please try again.")
      }
    } catch (err) {
      console.error("Logout error:", err)
      Alert.alert("Connection Error", "Could not connect to server. Please try again.")
    }
  }

  const navigateToRideHistory = () => {
    router.push("/ride-history")
  }

  const navigateToEarnings = () => {
    if (userData?.userType === "driver") {
      router.push("/earnings-history")
    }
  }

  const navigateToUpdateVehicle = () => {
    if (userData?.userType === "driver") {
      router.push("/update-vehicle")
    }
  }

  const navigateToPaymentMethods = () => {
    router.push("/payment-methods")
  }

  const navigateToSupport = () => {
    router.push("/support")
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#4B5563" />
        <Text className="mt-4 text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-red-500 text-lg mt-2">Error loading profile</Text>
        <Text className="text-gray-500 text-center mt-2 mb-4">{error}</Text>
        <TouchableOpacity className="bg-blue-500 py-3 px-6 rounded-lg" onPress={fetchUserData}>
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-800 mb-6">Account</Text>

          {userData && (
            <View className="bg-white rounded-xl shadow-sm mb-4">
              <View className="p-4 flex-row items-center">
                <View className="w-16 h-16 bg-gray-200 rounded-full justify-center items-center mr-4">
                  {userData.profile_picture ? (
                    <Image
                      source={{ uri: `${BASE_URL}${userData.profile_picture}` }}
                      className="w-16 h-16 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#777" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-800">{userData.username}</Text>
                  <Text className="text-gray-500">{userData.email}</Text>
                  {userData.phone_number && <Text className="text-gray-500">{userData.phone_number}</Text>}
                  <View className="flex-row items-center mt-1">
                    <Text className="text-gray-500 capitalize">{userData.userType}</Text>
                    {userData.userType === "driver" && userData.license_verified === 1 && (
                      <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                        <Text className="text-green-800 text-xs font-medium">Verified</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity className="mt-2">
                    <Text className="text-blue-600">Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Driver-specific information */}
          {userData?.userType === "driver" && (
            <View className="bg-white rounded-xl shadow-sm mb-4">
              <View className="p-4">
                <Text className="text-lg font-bold text-gray-800 mb-2">Driver Information</Text>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">License</Text>
                  <Text className="text-gray-800">{userData.driver_license}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">Vehicle</Text>
                  <Text className="text-gray-800">{userData.vehicle_model}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">Vehicle Color</Text>
                  <Text className="text-gray-800">{userData.vehicle_color}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">Plate Number</Text>
                  <Text className="text-gray-800">{userData.vehicle_plate}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">Experience</Text>
                  <Text className="text-gray-800">{userData.years_of_experience || "N/A"} years</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500">Status</Text>
                  <Text
                    className={
                      userData.license_verified === 1
                        ? "text-green-600 font-medium"
                        : userData.license_verified === 2
                          ? "text-red-600 font-medium"
                          : "text-yellow-600 font-medium"
                    }
                  >
                    {userData.license_verified === 1
                      ? "Verified"
                      : userData.license_verified === 2
                        ? "Rejected"
                        : "Pending Verification"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Menu Options */}
          <View className="bg-white rounded-xl shadow-sm mb-4">
            {/* Payment Methods */}
            <TouchableOpacity
              className="p-4 border-b border-gray-100 flex-row items-center"
              onPress={navigateToPaymentMethods}
            >
              <Ionicons name="card-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Ride History */}
            <TouchableOpacity
              className="p-4 border-b border-gray-100 flex-row items-center"
              onPress={navigateToRideHistory}
            >
              <Ionicons name="time-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Ride History</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Driver-specific options */}
            {userData?.userType === "driver" && (
              <>
                <TouchableOpacity
                  className="p-4 border-b border-gray-100 flex-row items-center"
                  onPress={navigateToEarnings}
                >
                  <Ionicons name="stats-chart-outline" size={24} color="#333" className="mr-3" />
                  <Text className="flex-1 text-gray-800 text-base">Earnings History</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity
                  className="p-4 border-b border-gray-100 flex-row items-center"
                  onPress={navigateToUpdateVehicle}
                >
                  <Ionicons name="car-outline" size={24} color="#333" className="mr-3" />
                  <Text className="flex-1 text-gray-800 text-base">Update Vehicle Info</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </>
            )}

            {/* Promotions */}
            <TouchableOpacity className="p-4 border-b border-gray-100 flex-row items-center">
              <Ionicons name="gift-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Promotions</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity className="p-4 flex-row items-center" onPress={navigateToSupport}>
              <Ionicons name="help-circle-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            className="bg-white p-4 rounded-xl shadow-sm mb-4 flex-row items-center"
            onPress={handleLogout}
          >
            <Ionicons name="exit-outline" size={24} color="#e74c3c" className="mr-3" />
            <Text className="text-red-500 text-base font-medium">Sign Out</Text>
          </TouchableOpacity>

          {/* App Info */}
          {userData && (
            <Text className="text-center text-gray-400 text-sm mt-4">
              Member since {new Date(userData.created_at).toLocaleDateString()}
            </Text>
          )}
          <Text className="text-center text-gray-400 text-sm mt-1">App Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
