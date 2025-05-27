"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  Switch,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { MaterialIcons, FontAwesome, Ionicons, Feather, AntDesign } from "@expo/vector-icons"
import { router } from "expo-router"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"

const BASE_URL = "http://192.168.42.161:8080"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  // Modal states
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDriverFormModal, setShowDriverFormModal] = useState(false)
  const [showUserFormModal, setShowUserFormModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleteType, setDeleteType] = useState("")
  const [formMode, setFormMode] = useState("create")

  // Form states
  const [userForm, setUserForm] = useState({
    id: "",
    username: "",
    email: "",
    phone_number: "",
    password: "",
  })

  const [driverForm, setDriverForm] = useState({
    id: "",
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
    vehicle_image: null,
  })

  useEffect(() => {
    fetchAdminProfile()
    fetchDashboardData()
  }, [])

  const fetchAdminProfile = async () => {
    try {
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
      // Fetch dashboard stats
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

      if (statsResponse.data.success) {
        const { stats } = statsResponse.data
        setStats({
          verifiedDrivers: stats.verifiedDrivers || 0,
          pendingDrivers: stats.pendingDrivers || 0,
          totalUsers: stats.totalUsers || 0,
          completedRides: stats.completedRides || 0,
          totalEarnings: stats.totalEarnings || 0,
        })
        setRecentRides(stats.recentRides || [])
      }

      if (driversResponse.data.success) {
        setDrivers(driversResponse.data.drivers || [])
      }

      if (pendingDriversResponse.data.success) {
        setPendingDrivers(pendingDriversResponse.data.drivers || [])
      }

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users || [])
      }

      if (ridesResponse.data.success && !recentRides.length) {
        setRecentRides(ridesResponse.data.rides?.slice(0, 10) || [])
      }
    } catch (error) {
      console.error("Dashboard error:", error)
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again")
        router.replace("/login")
      } else {
        Alert.alert("Error", "Failed to load dashboard data. Please check your connection.")
      }
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
        fetchDashboardData()
      } else {
        Alert.alert("Error", response.data.message || "Failed to update driver status")
      }
    } catch (error) {
      console.error("Update driver verification error:", error)
      Alert.alert("Error", "Failed to update driver verification status")
    }
  }

  // Image picker for driver vehicle
  const pickDriverVehicleImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload a vehicle image.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled) {
      setDriverForm({
        ...driverForm,
        vehicle_image: result.assets[0],
      })
    }
  }

  // CRUD Operations for Users
  const createUser = async () => {
    try {
      if (!userForm.username || !userForm.email || !userForm.password) {
        Alert.alert("Error", "Username, email, and password are required")
        return
      }

      const response = await axios.post(`${BASE_URL}/api/admin/users`, userForm, { withCredentials: true })

      if (response.data.success) {
        Alert.alert("Success", "User created successfully")
        setShowUserFormModal(false)
        resetUserForm()
        fetchDashboardData()
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

      const updateData = { ...userForm }
      if (!updateData.password) {
        delete updateData.password // Don't update password if empty
      }

      const response = await axios.put(`${BASE_URL}/api/admin/users/${userForm.id}`, updateData, {
        withCredentials: true,
      })

      if (response.data.success) {
        Alert.alert("Success", "User updated successfully")
        setShowUserFormModal(false)
        resetUserForm()
        fetchDashboardData()
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
      const response = await axios.delete(`${BASE_URL}/api/admin/users/${userId}`, { withCredentials: true })

      if (response.data.success) {
        Alert.alert("Success", "User deleted successfully")
        setShowDeleteConfirmModal(false)
        setItemToDelete(null)
        fetchDashboardData()
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
      const response = await axios.get(`${BASE_URL}/api/admin/users/${userId}`, { withCredentials: true })

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

  // CRUD Operations for Drivers - FIXED
  const createDriver = async () => {
    try {
      if (
        !driverForm.username ||
        !driverForm.email ||
        !driverForm.password ||
        !driverForm.vehicle_model ||
        !driverForm.vehicle_color ||
        !driverForm.vehicle_plate ||
        !driverForm.driver_license
      ) {
        Alert.alert("Error", "Please fill all required fields")
        return
      }

      // Use regular JSON for driver creation, not FormData
      const driverData = {
        username: driverForm.username,
        email: driverForm.email,
        password: driverForm.password,
        phone_number: driverForm.phone_number || "",
        vehicle_model: driverForm.vehicle_model,
        vehicle_color: driverForm.vehicle_color,
        vehicle_plate: driverForm.vehicle_plate,
        driver_license: driverForm.driver_license,
        years_of_experience: Number.parseInt(driverForm.years_of_experience) || 0,
        license_verified: driverForm.license_verified,
        available: driverForm.available,
      }

      const response = await axios.post(`${BASE_URL}/api/admin/drivers`, driverData, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })

      if (response.data.success) {
        Alert.alert("Success", "Driver created successfully")
        setShowDriverFormModal(false)
        resetDriverForm()
        fetchDashboardData()
      } else {
        Alert.alert("Error", response.data.message || "Failed to create driver")
      }
    } catch (error) {
      console.error("Create driver error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to create driver")
    }
  }

  const updateDriver = async () => {
    try {
      if (!driverForm.id) {
        Alert.alert("Error", "Driver ID is missing")
        return
      }

      // Prepare update data - only include fields that have values
      const updateData = {}

      if (driverForm.username) updateData.username = driverForm.username
      if (driverForm.email) updateData.email = driverForm.email
      if (driverForm.phone_number) updateData.phone_number = driverForm.phone_number
      if (driverForm.password) updateData.password = driverForm.password
      if (driverForm.vehicle_model) updateData.vehicle_model = driverForm.vehicle_model
      if (driverForm.vehicle_color) updateData.vehicle_color = driverForm.vehicle_color
      if (driverForm.vehicle_plate) updateData.vehicle_plate = driverForm.vehicle_plate
      if (driverForm.driver_license) updateData.driver_license = driverForm.driver_license
      if (driverForm.years_of_experience)
        updateData.years_of_experience = Number.parseInt(driverForm.years_of_experience) || 0

      // Always include these as they can be 0/1
      updateData.license_verified = driverForm.license_verified
      updateData.available = driverForm.available

      const response = await axios.put(`${BASE_URL}/api/admin/drivers/${driverForm.id}`, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })

      if (response.data.success) {
        Alert.alert("Success", "Driver updated successfully")
        setShowDriverFormModal(false)
        resetDriverForm()
        fetchDashboardData()
      } else {
        Alert.alert("Error", response.data.message || "Failed to update driver")
      }
    } catch (error) {
      console.error("Update driver error:", error)
      Alert.alert("Error", error.response?.data?.message || "Failed to update driver")
    }
  }

  const deleteDriver = async (driverId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/admin/drivers/${driverId}`, { withCredentials: true })

      if (response.data.success) {
        Alert.alert("Success", "Driver deleted successfully")
        setShowDeleteConfirmModal(false)
        setItemToDelete(null)
        fetchDashboardData()
      } else {
        Alert.alert("Error", response.data.message || "Failed to delete driver")
      }
    } catch (error) {
      console.error("Delete driver error:", error)
      Alert.alert("Error", "Failed to delete driver")
    }
  }

  const getDriverById = async (driverId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/drivers/${driverId}`, { withCredentials: true })

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

  // Helper functions
  const resetUserForm = () => {
    setUserForm({
      id: "",
      username: "",
      email: "",
      phone_number: "",
      password: "",
    })
  }

  const resetDriverForm = () => {
    setDriverForm({
      id: "",
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
      vehicle_image: null,
    })
  }

  const prepareUserFormForEdit = (user) => {
    setUserForm({
      id: user.id,
      username: user.username,
      email: user.email,
      phone_number: user.phone_number || "",
      password: "",
    })
    setFormMode("edit")
    setShowUserFormModal(true)
  }

  const prepareDriverFormForEdit = (driver) => {
    setDriverForm({
      id: driver.id,
      username: driver.username,
      email: driver.email,
      phone_number: driver.phone_number || "",
      password: "",
      vehicle_model: driver.vehicle_model || "",
      vehicle_color: driver.vehicle_color || "",
      vehicle_plate: driver.vehicle_plate || "",
      driver_license: driver.driver_license || "",
      years_of_experience: driver.years_of_experience?.toString() || "0",
      license_verified: driver.license_verified || 0,
      available: driver.available || 0,
      vehicle_image: null,
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

  // Render functions
  const renderStatCard = (icon, title, value, color) => (
    <View className="bg-white rounded-lg p-4 shadow-sm flex-1 mx-1">
      <View className={`bg-${color}-100 w-12 h-12 rounded-full items-center justify-center mb-2`}>{icon}</View>
      <Text className="text-gray-500 text-sm">{title}</Text>
      <Text className="text-xl font-bold mt-1">{value}</Text>
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
              <View key={driver.id} className="p-4 border-b border-gray-100">
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
                      onPress={() => updateDriverVerification(driver.id, true)}
                    >
                      <Ionicons name="checkmark" size={18} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-100 p-2 rounded-full"
                      onPress={() => updateDriverVerification(driver.id, false)}
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

      {/* Recent Rides */}
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
              </TouchableOpacity>
            ))
          ) : (
            <View className="p-4 items-center">
              <Text className="text-gray-500">No recent rides</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )

  const renderDrivers = () => {
    const allDrivers = [...drivers, ...pendingDrivers.filter((pd) => !drivers.some((d) => d.id === pd.id))]

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
                key={driver.id}
                className="bg-white rounded-lg shadow-sm mb-3 p-4"
                onPress={() => getDriverById(driver.id)}
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
                    <View className="flex-row mt-2">
                      <TouchableOpacity
                        className="bg-blue-100 p-2 rounded-full mr-2"
                        onPress={() => prepareDriverFormForEdit(driver)}
                      >
                        <Feather name="edit" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-red-100 p-2 rounded-full"
                        onPress={() => confirmDelete(driver.id, "driver")}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
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
                    <Text className="text-gray-500 mt-1">{user.phone_number || "No phone"}</Text>
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

  // Render User Form Modal
  const renderUserFormModal = () => (
    <Modal visible={showUserFormModal} transparent={true} animationType="slide">
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4 max-h-96">
          <ScrollView>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">{formMode === "create" ? "Add User" : "Edit User"}</Text>
              <TouchableOpacity onPress={() => setShowUserFormModal(false)}>
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Username *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={userForm.username}
                onChangeText={(text) => setUserForm({ ...userForm, username: text })}
                placeholder="Enter username"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Email *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={userForm.email}
                onChangeText={(text) => setUserForm({ ...userForm, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Phone Number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={userForm.phone_number}
                onChangeText={(text) => setUserForm({ ...userForm, phone_number: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">
                Password {formMode === "edit" ? "(leave empty to keep current)" : "*"}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={userForm.password}
                onChangeText={(text) => setUserForm({ ...userForm, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={formMode === "create" ? createUser : updateUser}
            >
              <Text className="text-white font-bold">{formMode === "create" ? "Create User" : "Update User"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  // Render Driver Form Modal - FIXED
  const renderDriverFormModal = () => (
    <Modal visible={showDriverFormModal} transparent={true} animationType="slide">
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4 max-h-96">
          <ScrollView>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">{formMode === "create" ? "Add Driver" : "Edit Driver"}</Text>
              <TouchableOpacity onPress={() => setShowDriverFormModal(false)}>
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Username *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.username}
                onChangeText={(text) => setDriverForm({ ...driverForm, username: text })}
                placeholder="Enter username"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Email *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.email}
                onChangeText={(text) => setDriverForm({ ...driverForm, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Phone Number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.phone_number}
                onChangeText={(text) => setDriverForm({ ...driverForm, phone_number: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">
                Password {formMode === "edit" ? "(leave empty to keep current)" : "*"}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.password}
                onChangeText={(text) => setDriverForm({ ...driverForm, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Vehicle Model *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.vehicle_model}
                onChangeText={(text) => setDriverForm({ ...driverForm, vehicle_model: text })}
                placeholder="Enter vehicle model"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Vehicle Color *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.vehicle_color}
                onChangeText={(text) => setDriverForm({ ...driverForm, vehicle_color: text })}
                placeholder="Enter vehicle color"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Vehicle Plate *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.vehicle_plate}
                onChangeText={(text) => setDriverForm({ ...driverForm, vehicle_plate: text })}
                placeholder="Enter vehicle plate"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Driver License *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.driver_license}
                onChangeText={(text) => setDriverForm({ ...driverForm, driver_license: text })}
                placeholder="Enter driver license"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Years of Experience</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                value={driverForm.years_of_experience}
                onChangeText={(text) => setDriverForm({ ...driverForm, years_of_experience: text })}
                placeholder="Enter years of experience"
                keyboardType="numeric"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">License Verified</Text>
              <View className="flex-row items-center">
                <Switch
                  value={driverForm.license_verified === 1}
                  onValueChange={(value) => setDriverForm({ ...driverForm, license_verified: value ? 1 : 0 })}
                />
                <Text className="ml-2 text-gray-700">
                  {driverForm.license_verified === 1 ? "Verified" : "Not Verified"}
                </Text>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Available</Text>
              <View className="flex-row items-center">
                <Switch
                  value={driverForm.available === 1}
                  onValueChange={(value) => setDriverForm({ ...driverForm, available: value ? 1 : 0 })}
                />
                <Text className="ml-2 text-gray-700">{driverForm.available === 1 ? "Available" : "Not Available"}</Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={formMode === "create" ? createDriver : updateDriver}
            >
              <Text className="text-white font-bold">{formMode === "create" ? "Create Driver" : "Update Driver"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  // Render User Details Modal
  const renderUserModal = () => (
    <Modal visible={showUserModal} transparent={true} animationType="slide">
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">User Details</Text>
            <TouchableOpacity onPress={() => setShowUserModal(false)}>
              <AntDesign name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <View>
              <View className="mb-3">
                <Text className="text-gray-500">Username</Text>
                <Text className="text-lg font-medium">{selectedUser.username}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-gray-500">Email</Text>
                <Text className="text-lg font-medium">{selectedUser.email}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-gray-500">Phone</Text>
                <Text className="text-lg font-medium">{selectedUser.phone_number || "N/A"}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-gray-500">Joined</Text>
                <Text className="text-lg font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
              </View>

              <View className="flex-row mt-4">
                <TouchableOpacity
                  className="bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1"
                  onPress={() => {
                    setShowUserModal(false)
                    prepareUserFormForEdit(selectedUser)
                  }}
                >
                  <Text className="text-white font-bold text-center">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-red-500 py-2 px-4 rounded-lg flex-1"
                  onPress={() => {
                    setShowUserModal(false)
                    confirmDelete(selectedUser.id, "user")
                  }}
                >
                  <Text className="text-white font-bold text-center">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )

  // Render Driver Details Modal
  const renderDriverModal = () => (
    <Modal visible={showDriverModal} transparent={true} animationType="slide">
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4 max-h-96">
          <ScrollView>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Driver Details</Text>
              <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedDriver && (
              <View>
                <View className="mb-3">
                  <Text className="text-gray-500">Username</Text>
                  <Text className="text-lg font-medium">{selectedDriver.username}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Email</Text>
                  <Text className="text-lg font-medium">{selectedDriver.email}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Phone</Text>
                  <Text className="text-lg font-medium">{selectedDriver.phone_number || "N/A"}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Vehicle Model</Text>
                  <Text className="text-lg font-medium">{selectedDriver.vehicle_model}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Vehicle Color</Text>
                  <Text className="text-lg font-medium">{selectedDriver.vehicle_color}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Vehicle Plate</Text>
                  <Text className="text-lg font-medium">{selectedDriver.vehicle_plate}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Driver License</Text>
                  <Text className="text-lg font-medium">{selectedDriver.driver_license}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Experience</Text>
                  <Text className="text-lg font-medium">{selectedDriver.years_of_experience || 0} years</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Status</Text>
                  <Text
                    className={`text-lg font-medium ${
                      selectedDriver.license_verified === 1
                        ? "text-green-600"
                        : selectedDriver.license_verified === 2
                          ? "text-red-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {selectedDriver.license_verified === 1
                      ? "Verified"
                      : selectedDriver.license_verified === 2
                        ? "Rejected"
                        : "Pending"}
                  </Text>
                </View>
                <View className="mb-3">
                  <Text className="text-gray-500">Availability</Text>
                  <Text
                    className={`text-lg font-medium ${selectedDriver.available ? "text-green-600" : "text-red-600"}`}
                  >
                    {selectedDriver.available ? "Available" : "Not Available"}
                  </Text>
                </View>

                {selectedDriver.vehicle_image && (
                  <View className="mb-3">
                    <Text className="text-gray-500">Vehicle Image</Text>
                    <Image
                      source={{ uri: `${BASE_URL}${selectedDriver.vehicle_image}` }}
                      className="w-full h-32 rounded-lg mt-2"
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View className="flex-row mt-4">
                  <TouchableOpacity
                    className="bg-blue-500 py-2 px-4 rounded-lg mr-2 flex-1"
                    onPress={() => {
                      setShowDriverModal(false)
                      prepareDriverFormForEdit(selectedDriver)
                    }}
                  >
                    <Text className="text-white font-bold text-center">Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-red-500 py-2 px-4 rounded-lg flex-1"
                    onPress={() => {
                      setShowDriverModal(false)
                      confirmDelete(selectedDriver.id, "driver")
                    }}
                  >
                    <Text className="text-white font-bold text-center">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  // Render Delete Confirmation Modal
  const renderDeleteConfirmModal = () => (
    <Modal visible={showDeleteConfirmModal} transparent={true} animationType="fade">
      <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-sm p-4">
          <Text className="text-xl font-bold mb-4">Confirm Delete</Text>
          <Text className="text-gray-700 mb-6">
            Are you sure you want to delete this {deleteType}? This action cannot be undone.
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-gray-300 py-2 px-4 rounded-lg mr-2 flex-1"
              onPress={() => setShowDeleteConfirmModal(false)}
            >
              <Text className="text-gray-700 font-bold text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-red-500 py-2 px-4 rounded-lg flex-1" onPress={handleDeleteConfirm}>
              <Text className="text-white font-bold text-center">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

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
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">{renderContent()}</View>

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

      {/* Modals */}
      {renderUserFormModal()}
      {renderDriverFormModal()}
      {renderUserModal()}
      {renderDriverModal()}
      {renderDeleteConfirmModal()}
    </View>
  )
}
