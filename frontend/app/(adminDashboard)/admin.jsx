"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { MaterialIcons, FontAwesome, Ionicons, Feather, AntDesign } from "@expo/vector-icons"
import { router } from "expo-router"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"


const BASE_URL = "http://192.168.137.5:8080"

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    verifiedDrivers: 0,
    pendingDrivers: 0,
    totalUsers: 0,
    completedRides: 0,
    totalEarnings: 0,
  })
  const [recentRides, setRecentRides] = useState([])
  const [drivers, setDrivers] = useState([])
  const [pendingDrivers, setPendingDrivers] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState("dashboard")
  const [profile, setProfile] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showDriverModal, setShowDriverModal] = useState(false)
  
  // New state variables for CRUD operations
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDriverFormModal, setShowDriverFormModal] = useState(false)
  const [showUserFormModal, setShowUserFormModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleteType, setDeleteType] = useState("") // "user" or "driver"
  const [formMode, setFormMode] = useState("create") // "create" or "edit"


  // Add this function to the AdminDashboard component
const pickDriverVehicleImage = async () => {
  // Request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (status !== "granted") {
    Alert.alert("Permission Required", "Please allow access to your photo library to upload a vehicle image.")
    return
  }

  // Launch image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images, // Using the non-deprecated API
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  })

  if (!result.canceled) {
    setDriverForm({
      ...driverForm,
      vehicle_image: result.assets[0]
    })
  }
}
  
  // Form state for user
  const [userForm, setUserForm] = useState({
    id: "",
    username: "",
    email: "",
    phone_number: "",
    password: "",
    role: "user"
  })
  
  // Form state for driver
  const [driverForm, setDriverForm] = useState({
    user_id: "",
    username: "",
    email: "",
    phone_number: "",
    password: "",
    vehicle_model: "",
    vehicle_color: "",
    vehicle_plate: "",
    driver_license: "",
    years_of_experience: "0",
    license_verified: 0,
    available: 1,
    // Add any missing fields from authController.js
    vehicle_image: null // This will be handled separately for file upload
  });
  
  // Selected user for viewing/editing
  const [selectedUser, setSelectedUser] = useState(null)

  // Fetch admin profile and dashboard data
  useEffect(() => {
    fetchAdminProfile()
    fetchDashboardData()
  }, [])

  const fetchAdminProfile = async () => {
    try {
      // Try to get profile from AsyncStorage first
      const userData = await AsyncStorage.getItem("userData")
      if (userData) {
        setProfile(JSON.parse(userData))
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      Alert.alert("Error", "Failed to load profile information")
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch dashboard stats - using the correct endpoint
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/dashboard-stats`, {
        withCredentials: true,
      })

      // Fetch all drivers
      const driversResponse = await axios.get(`${BASE_URL}/api/admin/drivers`, {
        withCredentials: true,
      })

      // Fetch pending drivers
      const pendingDriversResponse = await axios.get(`${BASE_URL}/api/admin/pending-drivers`, {
        withCredentials: true,
      })

      // Fetch users
      const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
        withCredentials: true,
      })

      // Fetch all rides
      const ridesResponse = await axios.get(`${BASE_URL}/api/admin/rides`, {
        withCredentials: true,
      })

      // Update state with fetched data
      if (statsResponse.data.success) {
        const { stats } = statsResponse.data
        setStats({
          verifiedDrivers: stats.verifiedDrivers,
          pendingDrivers: stats.pendingDrivers,
          totalUsers: stats.totalUsers,
          completedRides: stats.completedRides,
          totalEarnings: stats.totalEarnings,
        })
        setRecentRides(stats.recentRides || [])
      }

      if (driversResponse.data.success) {
        setDrivers(driversResponse.data.drivers)
      }

      if (pendingDriversResponse.data.success) {
        setPendingDrivers(pendingDriversResponse.data.drivers)
      }

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users)
      }

      if (ridesResponse.data.success && !recentRides.length) {
        // Only use this if we didn't get recent rides from dashboard-stats
        setRecentRides(ridesResponse.data.rides.slice(0, 10))
      }
    } catch (error) {
      console.error("Dashboard error:", error)
      Alert.alert("Error", "Failed to load dashboard data. Please check your connection.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
    fetchAdminProfile()
  }

  const handleLogout = async () => {
    try {
      await axios.get(`${BASE_URL}/api/auth/logout`, { withCredentials: true })
      await AsyncStorage.clear()
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Error", "Failed to logout. Please try again.")
    }
  }

  const updateDriverVerification = async (driverId, approved) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/admin/verify-driver`,
        {
          driverId,
          approved,
        },
        { withCredentials: true },
      )

      if (response.data.success) {
        Alert.alert("Success", `Driver ${approved ? "approved" : "rejected"} successfully`)
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", response.data.message || "Failed to update driver status")
      }
    } catch (error) {
      console.error("Update driver verification error:", error)
      Alert.alert("Error", "Failed to update driver verification status")
    }
  }

  // CRUD Operations for Users
  const createUser = async () => {
    try {
      if (!userForm.username || !userForm.email || !userForm.password) {
        Alert.alert("Error", "Username, email, and password are required")
        return
      }

      const response = await axios.post(
        `${BASE_URL}/api/admin/users`,
        userForm,
        { withCredentials: true }
      )

      if (response.data.success) {
        Alert.alert("Success", "User created successfully")
        setShowUserFormModal(false)
        resetUserForm()
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", response.data.message || "Failed to create user")
      }
    } catch (error) {
      console.error("Create user error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to create user")
    }
  }

  const updateUser = async () => {
    try {
      if (!userForm.id) {
        Alert.alert("Error", "User ID is missing")
        return
      }

      const response = await axios.put(
        `${BASE_URL}/api/admin/users/${userForm.id}`,
        userForm,
        { withCredentials: true }
      )

      if (response.data.success) {
        Alert.alert("Success", "User updated successfully")
        setShowUserFormModal(false)
        resetUserForm()
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", response.data.message || "Failed to update user")
      }
    } catch (error) {
      console.error("Update user error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to update user")
    }
  }

  const deleteUser = async (userId) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/admin/users/${userId}`,
        { withCredentials: true }
      )

      if (response.data.success) {
        Alert.alert("Success", "User deleted successfully")
        setShowDeleteConfirmModal(false)
        setItemToDelete(null)
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", response.data.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Delete user error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to delete user")
    }
  }

  const getUserById = async (userId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/admin/users/${userId}`,
        { withCredentials: true }
      )

      if (response.data.success) {
        setSelectedUser(response.data.user)
        setShowUserModal(true)
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch user details")
      }
    } catch (error) {
      console.error("Get user error:", error)
      Alert.alert("Error", "Failed to fetch user details")
    }
  }

  // CRUD Operations for Drivers
  const createDriver = async () => {
    try {
      if (!driverForm.username || !driverForm.email || !driverForm.password || 
          !driverForm.vehicle_model || !driverForm.vehicle_plate || !driverForm.driver_license) {
        Alert.alert("Error", "Please fill all required fields")
        return
      }
  
      // Create FormData for multipart/form-data request (for image upload)
      const formData = new FormData()
      
      // Add all driver form fields to formData
      Object.keys(driverForm).forEach(key => {
        if (key !== 'vehicle_image') {
          formData.append(key, driverForm[key])
        }
      })
      
      // Add vehicle image if available
      if (driverForm.vehicle_image) {
        const imageUri = driverForm.vehicle_image.uri
        const filename = imageUri.split('/').pop()
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : 'image'
        
        formData.append('vehicleImage', {
          uri: imageUri,
          name: filename,
          type
        })
      }
  
      const response = await fetch(`${BASE_URL}/api/admin/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
        credentials: 'include'
      })
  
      const data = await response.json()
  
      if (data.success) {
        Alert.alert("Success", "Driver created successfully")
        setShowDriverFormModal(false)
        resetDriverForm()
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", data.message || "Failed to create driver")
      }
    } catch (error) {
      console.error("Create driver error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to create driver")
    }
  }

 // Update the updateDriver function in AdminDashboard.tsx
const updateDriver = async () => {
  try {
    if (!driverForm.user_id) {
      Alert.alert("Error", "Driver ID is missing")
      return
    }

    // Create FormData for multipart/form-data request (for image upload)
    const formData = new FormData()
    
    // Add all driver form fields to formData
    Object.keys(driverForm).forEach(key => {
      if (key !== 'vehicle_image') {
        formData.append(key, driverForm[key])
      }
    })
    
    // Add vehicle image if available
    if (driverForm.vehicle_image) {
      const imageUri = driverForm.vehicle_image.uri
      const filename = imageUri.split('/').pop()
      const match = /\.(\w+)$/.exec(filename)
      const type = match ? `image/${match[1]}` : 'image'
      
      formData.append('vehicleImage', {
        uri: imageUri,
        name: filename,
        type
      })
    }

    const response = await fetch(`${BASE_URL}/api/admin/drivers/${driverForm.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
      credentials: 'include'
    })

    const data = await response.json()

    if (data.success) {
      Alert.alert("Success", "Driver updated successfully")
      setShowDriverFormModal(false)
      resetDriverForm()
      fetchDashboardData() // Refresh data
    } else {
      Alert.alert("Error", data.message || "Failed to update driver")
    }
  } catch (error) {
    console.error("Update driver error:", error)
    Alert.alert("Error", error.response?.data?.message || "Failed to update driver")
  }
}
  const deleteDriver = async (driverId) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/admin/drivers/${driverId}`,
        { withCredentials: true }
      )

      if (response.data.success) {
        Alert.alert("Success", "Driver deleted successfully")
        setShowDeleteConfirmModal(false)
        setItemToDelete(null)
        fetchDashboardData() // Refresh data
      } else {
        Alert.alert("Error", response.data.message || "Failed to delete driver")
      }
    } catch (error) {
      console.error("Delete driver error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to delete driver")
    }
  }

  const getDriverById = async (driverId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/admin/drivers/${driverId}`,
        { withCredentials: true }
      )

      if (response.data.success) {
        setSelectedDriver(response.data.driver)
        setShowDriverModal(true)
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch driver details")
      }
    } catch (error) {
      console.error("Get driver error:", error)
      Alert.alert("Error", "Failed to fetch driver details")
    }
  }

  // Helper functions for forms
  const resetUserForm = () => {
    setUserForm({
      id: "",
      username: "",
      email: "",
      phone_number: "",
      password: "",
      role: "user"
    })
  }

  const resetDriverForm = () => {
    setDriverForm({
      user_id: "",
      username: "",
      email: "",
      phone_number: "",
      password: "",
      vehicle_model: "",
      vehicle_color: "",
      vehicle_plate: "",
      driver_license: "",
      years_of_experience: "0",
      license_verified: 0,
      available: 1
    })
  }

  const prepareUserFormForEdit = (user) => {
    setUserForm({
      id: user.id,
      username: user.username,
      email: user.email,
      phone_number: user.phone_number || "",
      password: "", // Don't populate password for security
      role: user.role
    })
    setFormMode("edit")
    setShowUserFormModal(true)
  }

  const prepareDriverFormForEdit = (driver) => {
    setDriverForm({
      user_id: driver.user_id,
      username: driver.username,
      email: driver.email,
      phone_number: driver.phone_number || "",
      password: "", // Don't populate password for security
      vehicle_model: driver.vehicle_model,
      vehicle_color: driver.vehicle_color,
      vehicle_plate: driver.vehicle_plate,
      driver_license: driver.driver_license,
      years_of_experience: driver.years_of_experience?.toString() || "0",
      license_verified: driver.license_verified,
      available: driver.available
    })
    setFormMode("edit")
    setShowDriverFormModal(true)
  }

  const confirmDelete = (id, type) => {
    setItemToDelete(id)
    setDeleteType(type)
    setShowDeleteConfirmModal(true)
  }

  const handleDeleteConfirm = () => {
    if (deleteType === "user") {
      deleteUser(itemToDelete)
    } else if (deleteType === "driver") {
      deleteDriver(itemToDelete)
    }
  }

  const renderStatCard = (icon, title, value, color) => (
    <View className="bg-white rounded-lg p-4 shadow-sm flex-1 mx-1">
      <View className={`bg-${color}-100 w-12 h-12 rounded-full items-center justify-center mb-2`}>{icon}</View>
      <Text className="text-gray-500 text-sm">{title}</Text>
      <Text className="text-xl font-bold mt-1">{value}</Text>
    </View>
  )

  const renderRecentRides = () => (
    <View className="mt-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold">Recent Rides</Text>
        <TouchableOpacity onPress={() => setActiveTab("rides")}>
          <Text className="text-blue-500">View All</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-lg shadow-sm">
        {recentRides.length > 0 ? (
          recentRides.map((ride) => (
            <TouchableOpacity key={ride.id} className="p-4 border-b border-gray-100">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold">
                    {ride.user_name || "User"} → {ride.driver_name || "Driver"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">{new Date(ride.created_at).toLocaleString()}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold">${Number.parseFloat(ride.fare || 0).toFixed(2)}</Text>
                  <View
                    className={`px-2 py-1 rounded-full mt-1 ${
                      ride.status === "completed"
                        ? "bg-green-100"
                        : ride.status === "cancelled"
                          ? "bg-red-100"
                          : "bg-yellow-100"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        ride.status === "completed"
                          ? "text-green-800"
                          : ride.status === "cancelled"
                            ? "text-red-800"
                            : "text-yellow-800"
                      }`}
                    >
                      {ride.status}
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
            </TouchableOpacity>
          ))
        ) : (
          <View className="p-4 items-center">
            <Text className="text-gray-500">No recent rides</Text>
          </View>
        )}
      </View>
    </View>
  )

  const renderDashboard = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} className="px-4 py-6">
      <Text className="text-2xl font-bold mb-6">Dashboard Overview</Text>

      <View className="flex-row mb-4">
        {renderStatCard(
          <MaterialIcons name="directions-car" size={24} color="#3B82F6" />,
          "Completed Rides",
          stats.completedRides,
          "blue",
        )}
        {renderStatCard(
          <FontAwesome name="user" size={24} color="#10B981" />,
          "Verified Drivers",
          stats.verifiedDrivers,
          "green",
        )}
      </View>

      <View className="flex-row mb-6">
        {renderStatCard(
          <Ionicons name="people" size={24} color="#F59E0B" />,
          "Total Users",
          stats.totalUsers,
          "yellow",
        )}
        {renderStatCard(
          <FontAwesome name="money" size={24} color="#EF4444" />,
          "Total Earnings",
          `$${(stats.totalEarnings || 0).toFixed(2)}`,
          "red",
        )}
      </View>

      {/* Pending Driver Approvals */}
      <View className="mt-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold">Pending Driver Approvals</Text>
          <TouchableOpacity onPress={() => setActiveTab("drivers")}>
            <Text className="text-blue-500">View All</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white rounded-lg shadow-sm">
          {pendingDrivers.length > 0 ? (
            pendingDrivers.slice(0, 3).map((driver) => (
              <View key={driver.user_id} className="p-4 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="font-semibold">{driver.username}</Text>
                    <Text className="text-gray-500 text-sm">
                      {driver.vehicle_model} • {driver.vehicle_plate}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="bg-green-100 p-2 rounded-full mr-2"
                      onPress={() => updateDriverVerification(driver.user_id, true)}
                    >
                      <Ionicons name="checkmark" size={18} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-100 p-2 rounded-full"
                      onPress={() => updateDriverVerification(driver.user_id, false)}
                    >
                      <Ionicons name="close" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="p-4 items-center">
              <Text className="text-gray-500">No pending approvals</Text>
            </View>
          )}
        </View>
      </View>

      {renderRecentRides()}

      <View className="mt-6 mb-6 bg-white rounded-lg shadow-sm p-4">
        <Text className="text-lg font-bold mb-3">Quick Actions</Text>
        <View className="flex-row flex-wrap justify-between">
          <TouchableOpacity className="w-1/3 items-center mb-4" onPress={() => setActiveTab("drivers")}>
            <View className="bg-blue-100 w-14 h-14 rounded-full items-center justify-center">
              <MaterialIcons name="person-add" size={24} color="#3B82F6" />
            </View>
            <Text className="text-sm mt-2 text-center">Manage Drivers</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center mb-4" onPress={() => setActiveTab("users")}>
            <View className="bg-green-100 w-14 h-14 rounded-full items-center justify-center">
              <Feather name="users" size={24} color="#10B981" />
            </View>
            <Text className="text-sm mt-2 text-center">Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center mb-4" onPress={() => setActiveTab("rides")}>
            <View className="bg-yellow-100 w-14 h-14 rounded-full items-center justify-center">
              <Ionicons name="document-text" size={24} color="#F59E0B" />
            </View>
            <Text className="text-sm mt-2 text-center">View Rides</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )

  const renderProfileMenu = () => (
    <View className="absolute right-4 top-16 bg-white shadow-lg rounded-lg p-2 z-50 w-48">
      <View className="p-3 border-b border-gray-100">
        <Text className="font-semibold text-black">{profile?.username || "Admin"}</Text>
        <Text className="text-gray-500 text-sm">{profile?.email || "admin@example.com"}</Text>
      </View>
      <TouchableOpacity className="flex-row items-center p-3" onPress={handleLogout}>
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text className="ml-2 text-red-500">Logout</Text>
      </TouchableOpacity>
    </View>
  )

  const renderDriverModal = () => {
    if (!selectedDriver) return null

    return (
      <Modal
        visible={showDriverModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedDriver(null)
          setShowDriverModal(false)
        }}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-md p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Driver Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDriver(null)
                  setShowDriverModal(false)
                }}
              >
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="mb-4">
                <Text className="text-gray-500">Driver Name</Text>
                <Text className="text-lg font-semibold">{selectedDriver.username}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Email</Text>
                <Text className="text-lg">{selectedDriver.email}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Phone</Text>
                <Text className="text-lg">{selectedDriver.phone_number || "N/A"}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">License</Text>
                <Text className="text-lg">{selectedDriver.driver_license}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Vehicle</Text>
                <Text className="text-lg">
                  {selectedDriver.vehicle_model} ({selectedDriver.vehicle_color})
                </Text>
                <Text className="text-lg">{selectedDriver.vehicle_plate}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Experience</Text>
                <Text className="text-lg">{selectedDriver.years_of_experience || "N/A"} years</Text>
              </View>

              {selectedDriver.vehicle_image && (
                <View className="mb-4">
                  <Text className="text-gray-500 mb-2">Vehicle Image</Text>
                  <Image
                    source={{ uri: `${BASE_URL}${selectedDriver.vehicle_image}` }}
                    style={{ width: "100%", height: 150, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View className="mb-4 flex-row justify-between items-center">
                <Text className="text-gray-500">License Verified</Text>
                <Switch
                  value={selectedDriver.license_verified === 1}
                  onValueChange={(value) => {
                    updateDriverVerification(selectedDriver.user_id, value)
                    setSelectedDriver({
                      ...selectedDriver,
                      license_verified: value ? 1 : 0,
                    })
                  }}
                />
              </View>
            </ScrollView>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-blue-500 py-3 px-4 rounded-lg flex-1 mr-2 items-center"
                onPress={() => {
                  prepareDriverFormForEdit(selectedDriver)
                  setShowDriverModal(false)
                }}
              >
                <Text className="text-white font-bold">Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-red-500 py-3 px-4 rounded-lg flex-1 ml-2 items-center"
                onPress={() => {
                  setShowDriverModal(false)
                  confirmDelete(selectedDriver.user_id, "driver")
                }}
              >
                <Text className="text-white font-bold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const renderUserModal = () => {
    if (!selectedUser) return null

    return (
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedUser(null)
          setShowUserModal(false)
        }}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-md p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">User Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedUser(null)
                  setShowUserModal(false)
                }}
              >
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="mb-4">
                <Text className="text-gray-500">Username</Text>
                <Text className="text-lg font-semibold">{selectedUser.username}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Email</Text>
                <Text className="text-lg">{selectedUser.email}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Phone</Text>
                <Text className="text-lg">{selectedUser.phone_number || "N/A"}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Role</Text>
                <Text className="text-lg">{selectedUser.role}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500">Joined</Text>
                <Text className="text-lg">{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
              </View>
            </ScrollView>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-blue-500 py-3 px-4 rounded-lg flex-1 mr-2 items-center"
                onPress={() => {
                  prepareUserFormForEdit(selectedUser)
                  setShowUserModal(false)
                }}
              >
                <Text className="text-white font-bold">Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-red-500 py-3 px-4 rounded-lg flex-1 ml-2 items-center"
                onPress={() => {
                  setShowUserModal(false)
                  confirmDelete(selectedUser.id, "user")
                }}
              >
                <Text className="text-white font-bold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const renderUserFormModal = () => {
    return (
      <Modal
        visible={showUserFormModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          resetUserForm()
          setShowUserFormModal(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
            <View className="bg-white rounded-lg w-full max-w-md p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold">{formMode === "create" ? "Create User" : "Edit User"}</Text>
                <TouchableOpacity
                  onPress={() => {
                    resetUserForm()
                    setShowUserFormModal(false)
                  }}
                >
                  <AntDesign name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Username*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={userForm.username}
                    onChangeText={(text) => setUserForm({...userForm, username: text})}
                    placeholder="Enter username"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Email*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={userForm.email}
                    onChangeText={(text) => setUserForm({...userForm, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Phone Number</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={userForm.phone_number}
                    onChangeText={(text) => setUserForm({...userForm, phone_number: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Password {formMode === "edit" ? "(leave blank to keep current)" : "*"}</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={userForm.password}
                    onChangeText={(text) => setUserForm({...userForm, password: text})}
                    placeholder={formMode === "edit" ? "Leave blank to keep current" : "Enter password"}
                    secureTextEntry
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Role</Text>
                  <View className="flex-row">
                    <TouchableOpacity
                      className={`flex-1 py-2 px-4 rounded-l-lg ${userForm.role === "user" ? "bg-blue-500" : "bg-gray-200"}`}
                      onPress={() => setUserForm({...userForm, role: "user"})}
                    >
                      <Text className={`text-center ${userForm.role === "user" ? "text-white" : "text-gray-700"}`}>User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 py-2 px-4 rounded-r-lg ${userForm.role === "admin" ? "bg-blue-500" : "bg-gray-200"}`}
                      onPress={() => setUserForm({...userForm, role: "admin"})}
                    >
                      <Text className={`text-center ${userForm.role === "admin" ? "text-white" : "text-gray-700"}`}>Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center mt-4"
                onPress={formMode === "create" ? createUser : updateUser}
              >
                <Text className="text-white font-bold">{formMode === "create" ? "Create User" : "Update User"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  const renderDriverFormModal = () => {const renderDriverFormModal = () => {
    return (
      <Modal
        visible={showDriverFormModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          resetDriverForm()
          setShowDriverFormModal(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
            <View className="bg-white rounded-lg w-full max-w-md p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold">{formMode === "create" ? "Create Driver" : "Edit Driver"}</Text>
                <TouchableOpacity
                  onPress={() => {
                    resetDriverForm()
                    setShowDriverFormModal(false)
                  }}
                >
                  <AntDesign name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
  
              <ScrollView className="max-h-96">
                {/* User Information */}
                <Text className="text-lg font-semibold mb-2">User Information</Text>
                
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Username*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.username}
                    onChangeText={(text) => setDriverForm({...driverForm, username: text})}
                    placeholder="Enter username"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Email*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.email}
                    onChangeText={(text) => setDriverForm({...driverForm, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Phone Number</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.phone_number}
                    onChangeText={(text) => setDriverForm({...driverForm, phone_number: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Password {formMode === "edit" ? "(leave blank to keep current)" : "*"}</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.password}
                    onChangeText={(text) => setDriverForm({...driverForm, password: text})}
                    placeholder={formMode === "edit" ? "Leave blank to keep current" : "Enter password"}
                    secureTextEntry
                  />
                </View>
  
                {/* Driver Information */}
                <Text className="text-lg font-semibold mb-2 mt-4">Driver Information</Text>
                
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Driver License*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.driver_license}
                    onChangeText={(text) => setDriverForm({...driverForm, driver_license: text})}
                    placeholder="Enter driver license"
                  />
                </View>
                
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Model*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_model}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_model: text})}
                    placeholder="Enter vehicle model"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Color*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_color}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_color: text})}
                    placeholder="Enter vehicle color"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Plate*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_plate}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_plate: text})}
                    placeholder="Enter vehicle plate"
                  />
                </View>
  
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Years of Experience</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.years_of_experience}
                    onChangeText={(text) => setDriverForm({...driverForm, years_of_experience: text})}
                    placeholder="Enter years of experience"
                    keyboardType="numeric"
                  />
                </View>
  
                {/* Add Vehicle Image Upload */}
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Image</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-4 items-center justify-center"
                    style={{ height: 150 }}
                    onPress={pickDriverVehicleImage}
                  >
                    {driverForm.vehicle_image ? (
                      <Image
                        source={{ uri: driverForm.vehicle_image.uri }}
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
  
                <View className="mb-4 flex-row justify-between items-center">
                  <Text className="text-gray-500">License Verified</Text>
                  <Switch
                    value={driverForm.license_verified === 1}
                    onValueChange={(value) => setDriverForm({...driverForm, license_verified: value ? 1 : 0})}
                  />
                </View>
  
                <View className="mb-4 flex-row justify-between items-center">
                  <Text className="text-gray-500">Available</Text>
                  <Switch
                    value={driverForm.available === 1}
                    onValueChange={(value) => setDriverForm({...driverForm, available: value ? 1 : 0})}
                  />
                </View>
              </ScrollView>
  
              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center mt-4"
                onPress={formMode === "create" ? createDriver : updateDriver}
              >
                <Text className="text-white font-bold">{formMode === "create" ? "Create Driver" : "Update Driver"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }
    return (
      <Modal
        visible={showDriverFormModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          resetDriverForm()
          setShowDriverFormModal(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
            <View className="bg-white rounded-lg w-full max-w-md p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold">{formMode === "create" ? "Create Driver" : "Edit Driver"}</Text>
                <TouchableOpacity
                  onPress={() => {
                    resetDriverForm()
                    setShowDriverFormModal(false)
                  }}
                >
                  <AntDesign name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-96">
                {/* User Information */}
                <Text className="text-lg font-semibold mb-2">User Information</Text>
                
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Username*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.username}
                    onChangeText={(text) => setDriverForm({...driverForm, username: text})}
                    placeholder="Enter username"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Email*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.email}
                    onChangeText={(text) => setDriverForm({...driverForm, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Phone Number</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.phone_number}
                    onChangeText={(text) => setDriverForm({...driverForm, phone_number: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Password {formMode === "edit" ? "(leave blank to keep current)" : "*"}</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.password}
                    onChangeText={(text) => setDriverForm({...driverForm, password: text})}
                    placeholder={formMode === "edit" ? "Leave blank to keep current" : "Enter password"}
                    secureTextEntry
                  />
                </View>

                {/* Driver Information */}
                <Text className="text-lg font-semibold mb-2 mt-4">Driver Information</Text>
                
                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Model*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_model}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_model: text})}
                    placeholder="Enter vehicle model"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Color*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_color}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_color: text})}
                    placeholder="Enter vehicle color"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Vehicle Plate*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.vehicle_plate}
                    onChangeText={(text) => setDriverForm({...driverForm, vehicle_plate: text})}
                    placeholder="Enter vehicle plate"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Driver License*</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.driver_license}
                    onChangeText={(text) => setDriverForm({...driverForm, driver_license: text})}
                    placeholder="Enter driver license"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-500 mb-1">Years of Experience</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    value={driverForm.years_of_experience}
                    onChangeText={(text) => setDriverForm({...driverForm, years_of_experience: text})}
                    placeholder="Enter years of experience"
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4 flex-row justify-between items-center">
                  <Text className="text-gray-500">License Verified</Text>
                  <Switch
                    value={driverForm.license_verified === 1}
                    onValueChange={(value) => setDriverForm({...driverForm, license_verified: value ? 1 : 0})}
                  />
                </View>

                <View className="mb-4 flex-row justify-between items-center">
                  <Text className="text-gray-500">Available</Text>
                  <Switch
                    value={driverForm.available === 1}
                    onValueChange={(value) => setDriverForm({...driverForm, available: value ? 1 : 0})}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center mt-4"
                onPress={formMode === "create" ? createDriver : updateDriver}
              >
                <Text className="text-white font-bold">{formMode === "create" ? "Create Driver" : "Update Driver"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  const renderDeleteConfirmModal = () => {
    return (
      <Modal
        visible={showDeleteConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDeleteConfirmModal(false)
          setItemToDelete(null)
        }}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-md p-4">
            <View className="items-center mb-4">
              <AntDesign name="exclamationcircle" size={48} color="#EF4444" />
              <Text className="text-xl font-bold mt-2">Confirm Delete</Text>
              <Text className="text-gray-500 text-center mt-2">
                Are you sure you want to delete this {deleteType}? This action cannot be undone.
              </Text>
            </View>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-gray-300 py-3 px-4 rounded-lg flex-1 mr-2 items-center"
                onPress={() => {
                  setShowDeleteConfirmModal(false)
                  setItemToDelete(null)
                }}
              >
                <Text className="font-bold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-red-500 py-3 px-4 rounded-lg flex-1 ml-2 items-center"
                onPress={handleDeleteConfirm}
              >
                <Text className="text-white font-bold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const renderDrivers = () => {
    // Combine verified and pending drivers
    const allDrivers = [...drivers, ...pendingDrivers.filter((pd) => !drivers.some((d) => d.user_id === pd.user_id))]

    const filteredDrivers = allDrivers.filter(
      (driver) =>
        driver.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
      <View className="flex-1 p-4">
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity className="ml-2 bg-blue-500 p-2 rounded-lg" onPress={() => setSearchQuery("")}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-end mb-4">
          <TouchableOpacity 
            className="bg-green-500 py-2 px-4 rounded-lg flex-row items-center"
            onPress={() => {
              resetDriverForm()
              setFormMode("create")
              setShowDriverFormModal(true)
            }}
          >
            <AntDesign name="plus" size={18} color="white" />
            <Text className="text-white font-bold ml-1">Add Driver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver) => (
              <TouchableOpacity
                key={driver.user_id}
                className="bg-white rounded-lg shadow-sm mb-3 p-4"
                onPress={() => {
                  setSelectedDriver(driver)
                  setShowDriverModal(true)
                }}
              >
                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">{driver.username}</Text>
                    <Text className="text-gray-500">{driver.email}</Text>
                    <Text className="text-gray-500 mt-1">
                      {driver.vehicle_model} • {driver.vehicle_color} • {driver.vehicle_plate}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View
                      className={`px-2 py-1 rounded-full ${
                        driver.license_verified === 1
                          ? "bg-green-100"
                          : driver.license_verified === 2
                            ? "bg-red-100"
                            : "bg-yellow-100"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          driver.license_verified === 1
                            ? "text-green-800"
                            : driver.license_verified === 2
                              ? "text-red-800"
                              : "text-yellow-800"
                        }`}
                      >
                        {driver.license_verified === 1
                          ? "Verified"
                          : driver.license_verified === 2
                            ? "Rejected"
                            : "Pending"}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-full mt-1 ${
                        driver.available === 1 ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <Text className={`text-xs ${driver.available === 1 ? "text-green-800" : "text-gray-800"}`}>
                        {driver.available === 1 ? "Available" : "Unavailable"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No drivers found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }

  const renderUsers = () => {
    const filteredUsers = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
      <View className="flex-1 p-4">
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity className="ml-2 bg-blue-500 p-2 rounded-lg" onPress={() => setSearchQuery("")}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-end mb-4">
          <TouchableOpacity 
            className="bg-green-500 py-2 px-4 rounded-lg flex-row items-center"
            onPress={() => {
              resetUserForm()
              setFormMode("create")
              setShowUserFormModal(true)
            }}
          >
            <AntDesign name="plus" size={18} color="white" />
            <Text className="text-white font-bold ml-1">Add User</Text>
          </TouchableOpacity>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                className="bg-white rounded-lg shadow-sm mb-3 p-4"
                onPress={() => getUserById(user.id)}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">{user.username}</Text>
                    <Text className="text-gray-500">{user.email}</Text>
                    <Text className="text-gray-500 mt-1">
                      {user.phone_number || "No phone"} • {user.role}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="bg-blue-100 p-2 rounded-full mr-2"
                      onPress={() => prepareUserFormForEdit(user)}
                    >
                      <Feather name="edit" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-100 p-2 rounded-full"
                      onPress={() => confirmDelete(user.id, "user")}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No users found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }

  const renderRides = () => {
    return (
      <View className="flex-1 p-4">
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {recentRides.length > 0 ? (
            recentRides.map((ride) => (
              <View key={ride.id} className="bg-white rounded-lg shadow-sm mb-3 p-4">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">Ride #{ride.id}</Text>
                    <Text className="text-gray-700 mt-1">
                      <Text className="font-semibold">User:</Text> {ride.user_name || "Unknown"}
                    </Text>
                    <Text className="text-gray-700">
                      <Text className="font-semibold">Driver:</Text> {ride.driver_name || "Unknown"}
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
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No rides found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard()
      case "drivers":
        return renderDrivers()
      case "users":
        return renderUsers()
      case "rides":
        return renderRides()
      default:
        return renderDashboard()
    }
  }

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white shadow-sm px-4 pt-12 pb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold">Admin Panel</Text>
          <View className="flex-row items-center">
            <TouchableOpacity className="ml-4 relative" onPress={() => setShowProfileMenu(!showProfileMenu)}>
              <View className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                {profile?.profile_picture ? (
                  <Image source={{ uri: profile.profile_picture }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full bg-blue-500 items-center justify-center">
                    <Text className="text-white font-bold">{profile?.username?.charAt(0)?.toUpperCase() || "A"}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">{renderContent()}</View>

      {/* Profile Menu */}
      {showProfileMenu && renderProfileMenu()}

      {/* Modals */}
      {showDriverModal && renderDriverModal()}
      {showUserModal && renderUserModal()}
      {showUserFormModal && renderUserFormModal()}
      {showDriverFormModal && renderDriverFormModal()}
      {showDeleteConfirmModal && renderDeleteConfirmModal()}

      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3">
      <TouchableOpacity className="items-center" onPress={() => setActiveTab("dashboard")}>
        <MaterialIcons name="dashboard" size={24} color={activeTab === "dashboard" ? "#3B82F6" : "#6B7280"} />
        <Text className={`text-xs mt-1 ${activeTab === "dashboard" ? "text-blue-500" : "text-gray-500"}`}>
          Dashboard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center" onPress={() => setActiveTab("drivers")}>
        <MaterialIcons name="directions-car" size={24} color={activeTab === "drivers" ? "#3B82F6" : "#6B7280"} />
        <Text className={`text-xs mt-1 ${activeTab === "drivers" ? "text-blue-500" : "text-gray-500"}`}>Drivers</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center" onPress={() => setActiveTab("users")}>
        <Ionicons name="people" size={24} color={activeTab === "users" ? "#3B82F6" : "#6B7280"} />
        <Text className={`text-xs mt-1 ${activeTab === "users" ? "text-blue-500" : "text-gray-500"}`}>Users</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center" onPress={() => setActiveTab("rides")}>
        <Ionicons name="car" size={24} color={activeTab === "rides" ? "#3B82F6" : "#6B7280"} />
        <Text className={`text-xs mt-1 ${activeTab === "rides" ? "text-blue-500" : "text-gray-500"}`}>Rides</Text>
      </TouchableOpacity>
    </View>
  </View>
  )
}