"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;

const EarningsScreen = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
  })
  const [payments, setPayments] = useState([])
  const [rides, setRides] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState("all")

  useEffect(() => {
    loadEarningsData()
  }, [])

  const loadEarningsData = async () => {
    try {
      setLoading(true)

      // Load earnings summary - try multiple endpoints
      try {
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
            setPayments(earningsData.recentPayments || [])
          }
        } else {
          console.log("Drivers earnings endpoint not available, using mock data")
          // Use mock data for testing
          setEarnings({
            today: 45.5,
            thisWeek: 234.75,
            thisMonth: 1250.0,
            total: 5678.9,
          })
        }
      } catch (earningsError) {
        console.log("Earnings API error:", earningsError.message)
        // Use mock data
        setEarnings({
          today: 45.5,
          thisWeek: 234.75,
          thisMonth: 1250.0,
          total: 5678.9,
        })
      }

      // Load detailed ride history
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
          }
        } else {
          console.log("Rides history endpoint not available")
          setRides([])
        }
      } catch (ridesError) {
        console.log("Rides API error:", ridesError.message)
        setRides([])
      }
    } catch (error) {
      console.error("Error loading earnings data:", error)
      if (error.message.includes("401")) {
        Alert.alert("Session Expired", "Please login again")
        router.replace("/login")
      } else {
        Alert.alert("Error", "Failed to load earnings data. Please try again.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadEarningsData()
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

  const filterRidesByPeriod = (rides, period) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return rides.filter((ride) => {
      const rideDate = new Date(ride.created_at)
      switch (period) {
        case "today":
          return rideDate >= today
        case "week":
          return rideDate >= thisWeek
        case "month":
          return rideDate >= thisMonth
        default:
          return true
      }
    })
  }

  const getFilteredRides = () => {
    return filterRidesByPeriod(rides, selectedPeriod)
  }

  const calculatePeriodEarnings = (rides) => {
    return rides
      .filter((ride) => ride.status === "completed" && ride.payment_status === "paid")
      .reduce((total, ride) => total + Number.parseFloat(ride.fare || 0), 0)
  }

  const renderEarningsCard = (title, amount, icon, color) => (
    <View className="bg-white rounded-lg p-4 shadow-sm flex-1 mx-1">
      <View className={`bg-${color}-100 w-12 h-12 rounded-full items-center justify-center mb-2`}>{icon}</View>
      <Text className="text-gray-500 text-sm">{title}</Text>
      <Text className="text-xl font-bold mt-1">${amount.toFixed(2)}</Text>
    </View>
  )

  const renderPeriodButton = (period, label) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full mr-2 ${selectedPeriod === period ? "bg-blue-500" : "bg-gray-200"}`}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text className={`font-medium ${selectedPeriod === period ? "text-white" : "text-gray-700"}`}>{label}</Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading earnings data...</Text>
      </SafeAreaView>
    )
  }

  const filteredRides = getFilteredRides()
  const periodEarnings = calculatePeriodEarnings(filteredRides)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-6 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Earnings History</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        {/* Earnings Summary */}
        <View className="px-4 py-6">
          <Text className="text-xl font-bold mb-4">Earnings Summary</Text>

          <View className="flex-row mb-4">
            {renderEarningsCard(
              "Today",
              earnings.today,
              <FontAwesome5 name="calendar-day" size={20} color="#3B82F6" />,
              "blue",
            )}
            {renderEarningsCard(
              "This Week",
              earnings.thisWeek,
              <FontAwesome5 name="calendar-week" size={20} color="#10B981" />,
              "green",
            )}
          </View>

          <View className="flex-row mb-6">
            {renderEarningsCard(
              "This Month",
              earnings.thisMonth,
              <FontAwesome5 name="calendar-alt" size={20} color="#F59E0B" />,
              "yellow",
            )}
            {renderEarningsCard(
              "Total Earnings",
              earnings.total,
              <FontAwesome5 name="money-bill-wave" size={20} color="#EF4444" />,
              "red",
            )}
          </View>
        </View>

        {/* Period Filter */}
        <View className="px-4 mb-4">
          <Text className="text-lg font-bold mb-3">Filter by Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderPeriodButton("all", "All Time")}
            {renderPeriodButton("today", "Today")}
            {renderPeriodButton("week", "This Week")}
            {renderPeriodButton("month", "This Month")}
          </ScrollView>
        </View>

        {/* Period Earnings */}
        <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold mb-2">
            {selectedPeriod === "all"
              ? "Total Earnings"
              : selectedPeriod === "today"
                ? "Today's Earnings"
                : selectedPeriod === "week"
                  ? "This Week's Earnings"
                  : "This Month's Earnings"}
          </Text>
          <Text className="text-2xl font-bold text-blue-600">${periodEarnings.toFixed(2)}</Text>
          <Text className="text-gray-500 mt-1">{filteredRides.length} rides completed</Text>
        </View>

        {/* Recent Payments */}
        <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold mb-3">Recent Payments</Text>

          {payments.length > 0 ? (
            payments.slice(0, 5).map((payment, index) => (
              <View
                key={index}
                className={`flex-row justify-between items-center py-3 ${
                  index < payments.length - 1 ? "border-b border-gray-100" : ""
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
              <Text className="text-gray-400 text-sm mt-1">Complete rides to see payments here</Text>
            </View>
          )}
        </View>

        {/* Detailed Ride History */}
        <View className="bg-white mx-4 mb-6 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold mb-3">Ride History</Text>

          {filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <View key={ride.id} className="border-b border-gray-100 py-3 last:border-b-0">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">Ride #{ride.id}</Text>
                    <Text className="text-gray-700 mt-1">
                      <Text className="font-semibold">Rider:</Text> {ride.rider_name || ride.user_name || "Unknown"}
                    </Text>
                    {/* Display location information */}
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
            <View className="py-6 items-center">
              <MaterialCommunityIcons name="car-off" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2">No rides found for this period</Text>
              <Text className="text-gray-400 text-sm mt-1">Start accepting rides to see your earnings</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default EarningsScreen
