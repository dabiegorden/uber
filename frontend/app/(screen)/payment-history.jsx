"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL

const PaymentHistoryScreen = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payments, setPayments] = useState([])
  const [totalEarnings, setTotalEarnings] = useState(0)

  useEffect(() => {
    loadPaymentHistory()
  }, [])

  const loadPaymentHistory = async () => {
    try {
      setLoading(true)
      console.log("Loading payment history...")

      // Try to get payments from dedicated endpoint
      try {
        const response = await fetch(`${BASE_URL}/api/drivers/earnings`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setPayments(data.recentPayments || [])
            setTotalEarnings(data.earnings?.total || 0)
            console.log(`Loaded ${data.recentPayments?.length || 0} payments`)
            setLoading(false)
            setRefreshing(false)
            return
          }
        }
      } catch (error) {
        console.log("Error fetching from earnings endpoint:", error)
      }

      // Fallback to ride history
      try {
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
            // Filter completed and paid rides
            const completedRides = data.rides.filter(
              (ride) => ride.status === "completed" && ride.payment_status === "paid",
            )

            // Format as payments
            const formattedPayments = completedRides.map((ride) => ({
              ride_id: ride.id,
              amount: ride.fare,
              created_at: ride.created_at,
              status: "succeeded",
            }))

            setPayments(formattedPayments)

            // Calculate total earnings
            const total = completedRides.reduce((sum, ride) => sum + Number.parseFloat(ride.fare || 0), 0)
            setTotalEarnings(total)

            console.log(`Loaded ${formattedPayments.length} payments from rides`)
          }
        }
      } catch (error) {
        console.error("Error loading payment history:", error)
        Alert.alert("Error", "Failed to load payment history. Please try again.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadPaymentHistory()
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
        <Text className="mt-4 text-gray-600">Loading payment history...</Text>
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
            <Text className="text-white text-xl font-bold">Payment History</Text>
          </View>

          <View className="bg-white/20 rounded-lg p-4">
            <Text className="text-white opacity-80">Total Earnings</Text>
            <Text className="text-white text-3xl font-bold">${totalEarnings.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment List */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-gray-800 font-bold text-lg mb-3">All Payments</Text>

          {payments.length > 0 ? (
            payments.map((payment, index) => (
              <View
                key={index}
                className={`flex-row justify-between items-center py-4 ${
                  index < payments.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-row items-center">
                  <View className="bg-green-100 p-3 rounded-full mr-3">
                    <FontAwesome5 name="money-bill-wave" size={16} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-gray-800 font-medium">Ride #{payment.ride_id}</Text>
                    <Text className="text-gray-500 text-sm">{formatDate(payment.created_at)}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-gray-900 font-bold">${Number.parseFloat(payment.amount || 0).toFixed(2)}</Text>
                  <View className="bg-green-100 px-2 py-1 rounded-full mt-1">
                    <Text className="text-green-800 text-xs font-medium">PAID</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="py-10 items-center">
              <FontAwesome5 name="money-bill-wave" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-4">No payment history found</Text>
              <Text className="text-gray-400 text-sm mt-1">Complete rides to earn money</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default PaymentHistoryScreen
