"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL

const RideHistoryScreen = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rides, setRides] = useState([])
  const [activeFilter, setActiveFilter] = useState("all") // all, completed, cancelled, pending

  useEffect(() => {
    loadRideHistory()
  }, [])

  const loadRideHistory = async () => {
    try {
      setLoading(true)
      console.log("Loading ride history...")

      // Try driver-specific endpoint first
      try {
        const response = await fetch(`${BASE_URL}/api/drivers/recent-rides`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setRides(data.rides || [])
            console.log(`Loaded ${data.rides?.length || 0} rides from driver endpoint`)
            setLoading(false)
            setRefreshing(false)
            return
          }
        }
      } catch (error) {
        console.log("Driver-specific rides endpoint not available")
      }

      // Fallback to general ride history
      const response = await fetch(`${BASE_URL}/api/rides/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRides(data.rides || [])
          console.log(`Loaded ${data.rides?.length || 0} rides from general history endpoint`)
        } else {
          Alert.alert("Error", data.message || "Failed to load ride history")
        }
      } else {
        Alert.alert("Error", "Failed to load ride history. Please try again.")
      }
    } catch (error) {
      console.error("Error loading ride history:", error)
      Alert.alert("Error", "Failed to load ride history. Please try again.")
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

  const getFilteredRides = () => {
    if (activeFilter === "all") {
      return rides
    }
    return rides.filter((ride) => ride.status === activeFilter)
  }

  const filteredRides = getFilteredRides()

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
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-6 pb-8">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Ride History</Text>
          </View>

          <View className="bg-white/20 rounded-lg p-4">
            <Text className="text-white opacity-80">Total Rides</Text>
            <Text className="text-white text-3xl font-bold">{rides.length}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="bg-white mx-4 mt-4 p-2 rounded-xl shadow-sm">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity
              className={`px-4 py-2 mx-1 rounded-full ${activeFilter === "all" ? "bg-blue-100" : "bg-gray-100"}`}
              onPress={() => setActiveFilter("all")}
            >
              <Text className={`font-medium ${activeFilter === "all" ? "text-blue-600" : "text-gray-600"}`}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-4 py-2 mx-1 rounded-full ${activeFilter === "completed" ? "bg-green-100" : "bg-gray-100"}`}
              onPress={() => setActiveFilter("completed")}
            >
              <Text className={`font-medium ${activeFilter === "completed" ? "text-green-600" : "text-gray-600"}`}>
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-4 py-2 mx-1 rounded-full ${activeFilter === "cancelled" ? "bg-red-100" : "bg-gray-100"}`}
              onPress={() => setActiveFilter("cancelled")}
            >
              <Text className={`font-medium ${activeFilter === "cancelled" ? "text-red-600" : "text-gray-600"}`}>
                Cancelled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-4 py-2 mx-1 rounded-full ${
                activeFilter === "requested" ? "bg-yellow-100" : "bg-gray-100"
              }`}
              onPress={() => setActiveFilter("requested")}
            >
              <Text className={`font-medium ${activeFilter === "requested" ? "text-yellow-600" : "text-gray-600"}`}>
                Pending
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ride List */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          {filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <View key={ride.id} className="bg-white rounded-lg shadow-sm mb-4 p-4 border border-gray-100">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">Ride #{ride.id}</Text>
                    <Text className="text-gray-700 mt-1">
                      <Text className="font-semibold">User:</Text> {ride.user_name || "Unknown"}
                    </Text>
                    {ride.pickup_location && (
                      <Text className="text-gray-500 text-sm mt-1">
                        <Text className="font-semibold">From:</Text> {ride.pickup_location}
                      </Text>
                    )}
                    {ride.dropoff_location && (
                      <Text className="text-gray-500 text-sm">
                        <Text className="font-semibold">To:</Text> {ride.dropoff_location}
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
              </View>
            ))
          ) : (
            <View className="py-10 items-center">
              <MaterialCommunityIcons name="car-off" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-4">No rides found</Text>
              {activeFilter !== "all" ? (
                <Text className="text-gray-400 text-sm mt-1">Try a different filter</Text>
              ) : (
                <Text className="text-gray-400 text-sm mt-1">Start accepting rides to see them here</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default RideHistoryScreen
