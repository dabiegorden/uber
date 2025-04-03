"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import BottomSheetComponent from "../../components/BottomSheetComponent"

// Set the base URL for all fetch requests
const BASE_URL = "http://192.168.137.107:8080"

const MapScreen = () => {
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [searchingDrivers, setSearchingDrivers] = useState(false)
  const mapRef = useRef(null)

  // Get user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setUser(data.user)
        } else {
          // If not authenticated, redirect to login
          Alert.alert("Session Expired", "Please login again")
          router.replace("/login")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        Alert.alert("Error", "Unable to fetch user profile")
      }
    }

    fetchUserProfile()
  }, [])

  // Get user's location
  useEffect(() => {
    ;(async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          setLoading(false)
          return
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        setLocation(currentLocation)

        // Update location in backend
        await updateLocationInBackend(currentLocation.coords.latitude, currentLocation.coords.longitude)
      } catch (error) {
        console.error("Error getting location:", error)
        setErrorMsg("Could not get your location")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Set up location subscription
  useEffect(() => {
    let locationSubscription

    const startLocationUpdates = async () => {
      // Request permissions again to be sure
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      // Watch position changes
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // update if moved by 10 meters
          timeInterval: 30000, // or every 30 seconds
        },
        (newLocation) => {
          setLocation(newLocation)
          updateLocationInBackend(newLocation.coords.latitude, newLocation.coords.longitude)
        },
      )
    }

    startLocationUpdates()

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [])

  // Function to update location in backend
  const updateLocationInBackend = async (latitude, longitude) => {
    try {
      await fetch(`${BASE_URL}/api/update-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
        credentials: "include",
      })
    } catch (error) {
      console.error("Failed to update location in backend:", error)
    }
  }

  // Function to search for nearby drivers
  const searchNearbyDrivers = async () => {
    if (!location) {
      Alert.alert("Error", "Your location is not available")
      return
    }

    setSearchingDrivers(true)

    try {
      const response = await fetch(`${BASE_URL}/api/rides/nearby-drivers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          radius: 5, // 5km radius
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNearbyDrivers(data.drivers)

        // If drivers found, adjust map to show all markers
        if (data.drivers.length > 0) {
          fitAllMarkers([
            ...data.drivers,
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
          ])
        } else {
          Alert.alert("No Drivers", "No available drivers found nearby")
        }
      } else {
        Alert.alert("Error", data.message || "Failed to find nearby drivers")
      }
    } catch (error) {
      console.error("Error searching for drivers:", error)
      Alert.alert("Error", "Failed to search for nearby drivers")
    } finally {
      setSearchingDrivers(false)
    }
  }

  // Function to fit all markers on the map
  const fitAllMarkers = (markers) => {
    if (mapRef.current && markers.length > 0) {
      mapRef.current.fitToCoordinates(
        markers.map((marker) => ({
          latitude: Number.parseFloat(marker.latitude),
          longitude: Number.parseFloat(marker.longitude),
        })),
        {
          edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
          animated: true,
        },
      )
    }
  }

  // Function to request a ride
  const requestRide = async (driver) => {
    if (!location) {
      Alert.alert("Error", "Your location is not available")
      return
    }

    setSelectedDriver(null)

    try {
      const response = await fetch(`${BASE_URL}/api/rides/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverId: driver.id,
          pickupLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          dropoffLocation: {
            latitude: location.coords.latitude, // This would normally be different
            longitude: location.coords.longitude, // This would normally be different
          },
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        Alert.alert("Ride Requested", "Your ride request has been sent to the driver", [
          {
            text: "View Status",
            onPress: () => router.push(`/ride/${data.rideId}`),
          },
        ])
        // Clear driver markers after booking
        setNearbyDrivers([])
      } else {
        Alert.alert("Error", data.message || "Failed to request ride")
      }
    } catch (error) {
      console.error("Error requesting ride:", error)
      Alert.alert("Error", "Failed to request ride")
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      // Navigate to login
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Error", "Failed to logout")
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Getting your location...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1" style={{ position: "relative" }}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
          <View>
            <Text className="text-gray-500 font-bold text-xl">Welcome, {user ? user.username : "User"}</Text>
          </View>
          <TouchableOpacity className="p-2" onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View className="flex-1">
          {errorMsg ? (
            <View className="flex-1 justify-center items-center p-6">
              <Text className="text-red-500 text-lg font-medium mb-4">{errorMsg}</Text>
              <Text className="text-gray-600 text-center">
                This app needs location permissions to work properly. Please enable location services in your device
                settings.
              </Text>
            </View>
          ) : location ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation
              showsMyLocationButton
              followsUserLocation
            >
              {/* User's current location marker */}
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="You are here"
                description="Your current location"
                pinColor="blue"
              />

              {/* Driver markers */}
              {nearbyDrivers.map((driver) => (
                <Marker
                  key={driver.id}
                  coordinate={{
                    latitude: Number.parseFloat(driver.latitude),
                    longitude: Number.parseFloat(driver.longitude),
                  }}
                  title={driver.username}
                  description={`${driver.vehicle_model} (${driver.vehicle_color})`}
                  pinColor="green"
                  onPress={() => setSelectedDriver(driver)}
                >
                  <Callout tooltip>
                    <View className="bg-white p-3 rounded-lg shadow-md" style={{ width: 150 }}>
                      <Text className="font-bold">{driver.username}</Text>
                      <Text className="text-gray-700">{driver.vehicle_model}</Text>
                      <Text className="text-gray-700">
                        {driver.vehicle_color} · {driver.vehicle_plate}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">{driver.distance.toFixed(1)} km away</Text>
                      <TouchableOpacity
                        className="mt-2 bg-blue-500 py-2 px-4 rounded-lg"
                        onPress={() => requestRide(driver)}
                      >
                        <Text className="text-white text-center font-medium">Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-600">Waiting for location data...</Text>
            </View>
          )}

          {/* Floating Search Button - Moved to left side to avoid overlapping */}
          {location && !searchingDrivers && (
            <TouchableOpacity
              onPress={searchNearbyDrivers}
              className="absolute top-4 left-4 bg-blue-500 p-3 rounded-full shadow-lg"
            >
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          )}

          {/* Loading Indicator for Searching */}
          {searchingDrivers && (
            <View className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-lg">
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          )}
        </View>

        {/* Bottom Sheet Component - Pass the searchNearbyDrivers function */}
        <BottomSheetComponent onSearchDrivers={searchNearbyDrivers} searchingDrivers={searchingDrivers} />
      </View>
    </SafeAreaView>
  )
}

export default MapScreen

