"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import BottomSheetComponent from "../../components/BottomSheetComponent"
import AsyncStorage from "@react-native-async-storage/async-storage"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL

export default function Map() {
  // State for location and map
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)

  // State for user
  const [user, setUser] = useState(null)

  // State for drivers
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [searchingDrivers, setSearchingDrivers] = useState(false)
  const [driversSearched, setDriversSearched] = useState(false)

  // State for location search - Updated for text-based search
  const [destinationQuery, setDestinationQuery] = useState("")
  const [searchingLocation, setSearchingLocation] = useState(false)

  // Get user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching user profile...")

        // Try to get user data from AsyncStorage first
        const userData = await AsyncStorage.getItem("userData")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          console.log("User profile from storage:", parsedUser.username)
          setUser(parsedUser)
          return
        }

        // If not in storage, fetch from API
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        const data = await response.json()

        if (response.ok && data.success) {
          console.log("User profile fetched successfully:", data.user.username)
          setUser(data.user)
          // Store in AsyncStorage for future use
          await AsyncStorage.setItem("userData", JSON.stringify(data.user))
        } else {
          console.error("Failed to fetch user profile:", data.message)
          Alert.alert("Session Expired", "Please login again")
          router.replace("/login")
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        Alert.alert("Error", "Unable to fetch user profile. Please check your connection.")
      }
    }

    fetchUserProfile()
  }, [])

  // Get user's location
  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          setLoading(false)
          return
        }

        console.log("Getting current location...")
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        console.log("Current location:", currentLocation.coords.latitude, currentLocation.coords.longitude)
        setLocation(currentLocation)
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
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 30000,
        },
        (newLocation) => {
          setLocation(newLocation)
        },
      )
    }

    startLocationUpdates()

    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [])

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in kilometers
    return distance
  }

  // Function to search for drivers by location - Updated for text-based search
  const searchForDriversByLocation = async () => {
    if (!destinationQuery.trim()) {
      Alert.alert("Error", "Please enter a destination location")
      return
    }

    if (!location) {
      Alert.alert("Error", "Your current location is not available")
      return
    }

    setSearchingDrivers(true)
    setDriversSearched(true)
    setNearbyDrivers([]) // Clear previous results

    try {
      console.log("Searching for drivers in location:", destinationQuery)

      // Search for drivers by location text
      const response = await fetch(`${BASE_URL}/api/rides/nearby-drivers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: destinationQuery.trim(),
          userLatitude: location.coords.latitude,
          userLongitude: location.coords.longitude,
        }),
        credentials: "include",
      })

      const data = await response.json()
      console.log("Drivers search response:", data)

      if (response.ok && data.success) {
        console.log(`Found ${data.drivers?.length || 0} drivers in ${destinationQuery}`)

        if (data.drivers && data.drivers.length > 0) {
          const processedDrivers = data.drivers.map((driver, index) => {
            // Generate random coordinates around the user's location for demo
            // In a real app, you'd get actual driver coordinates from GPS
            const latOffset = (Math.random() - 0.5) * 0.02 // Random offset within ~1km
            const lngOffset = (Math.random() - 0.5) * 0.02
            const driverLat = location.coords.latitude + latOffset
            const driverLng = location.coords.longitude + lngOffset

            // Calculate distance and fare
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              driverLat,
              driverLng,
            )
            const baseFare = 5.0
            const ratePerKm = 2.5
            const calculatedFare = baseFare + distance * ratePerKm

            return {
              ...driver,
              latitude: driverLat,
              longitude: driverLng,
              fare: calculatedFare.toFixed(2),
              distance: distance.toFixed(1),
              destination: destinationQuery, // Store the searched destination
            }
          })

          setNearbyDrivers(processedDrivers)

          // Fit map to show all drivers
          const allCoordinates = [
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            ...processedDrivers,
          ]
          fitAllMarkers(allCoordinates)

          Alert.alert(
            "Drivers Found",
            `Found ${processedDrivers.length} available drivers in ${destinationQuery}. Tap on a driver marker to view details.`,
          )
        } else {
          Alert.alert(
            "No Drivers Available",
            `No drivers are currently available in ${destinationQuery}. Please try a different location or try again later.`,
          )
          setNearbyDrivers([])
        }
      } else {
        console.error("Failed to fetch drivers:", data.message)
        Alert.alert(
          "Search Failed",
          data.message || `No drivers found in ${destinationQuery}. Please try a different location.`,
        )
        setNearbyDrivers([])
      }
    } catch (error) {
      console.error("Error searching for drivers:", error)
      Alert.alert(
        "Connection Error",
        "Unable to search for drivers. Please check your internet connection and try again.",
      )
      setNearbyDrivers([])
    } finally {
      setSearchingDrivers(false)
    }
  }

  // Function to search for all available drivers (fallback)
  const searchForAllDrivers = async () => {
    if (!location) {
      Alert.alert("Error", "Your current location is not available")
      return
    }

    setSearchingDrivers(true)
    setDriversSearched(true)
    setNearbyDrivers([]) // Clear previous results

    try {
      console.log("Searching for all available drivers...")

      const response = await fetch(`${BASE_URL}/api/rides/all-available-drivers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      const data = await response.json()
      console.log("All drivers search response:", data)

      if (response.ok && data.success) {
        console.log(`Found ${data.drivers?.length || 0} available drivers`)

        if (data.drivers && data.drivers.length > 0) {
          const processedDrivers = data.drivers.map((driver) => {
            // Generate random coordinates around the user's location for demo
            const latOffset = (Math.random() - 0.5) * 0.02 // Random offset within ~1km
            const lngOffset = (Math.random() - 0.5) * 0.02
            const driverLat = location.coords.latitude + latOffset
            const driverLng = location.coords.longitude + lngOffset

            // Calculate distance and fare
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              driverLat,
              driverLng,
            )
            const baseFare = 5.0
            const ratePerKm = 2.5
            const calculatedFare = baseFare + distance * ratePerKm

            return {
              ...driver,
              latitude: driverLat,
              longitude: driverLng,
              fare: calculatedFare.toFixed(2),
              distance: distance.toFixed(1),
              destination: "Current Location", // Default destination
            }
          })

          setNearbyDrivers(processedDrivers)

          // Fit map to show all drivers
          const allCoordinates = [
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            ...processedDrivers,
          ]
          fitAllMarkers(allCoordinates)

          Alert.alert(
            "Drivers Found",
            `Found ${processedDrivers.length} available drivers near you. Tap on a driver marker to view details.`,
          )
        } else {
          Alert.alert("No Drivers Available", "All drivers are busy now. Please try again later.")
          setNearbyDrivers([])
        }
      } else {
        console.error("Failed to fetch drivers:", data.message)
        Alert.alert("Search Failed", "Unable to find drivers. Please try again later.")
        setNearbyDrivers([])
      }
    } catch (error) {
      console.error("Error searching for drivers:", error)
      Alert.alert(
        "Connection Error",
        "Unable to search for drivers. Please check your internet connection and try again.",
      )
      setNearbyDrivers([])
    } finally {
      setSearchingDrivers(false)
    }
  }

  // Function to fit all markers on the map
  const fitAllMarkers = (markers) => {
    if (mapRef.current && markers && markers.length > 0) {
      try {
        mapRef.current.fitToCoordinates(
          markers.map((marker) => ({
            latitude: Number.parseFloat(marker.latitude),
            longitude: Number.parseFloat(marker.longitude),
          })),
          {
            edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
            animated: true,
          },
        )
      } catch (error) {
        console.error("Error fitting markers on map:", error)
      }
    }
  }

  // Function to center map on user's location
  const centerOnUserLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      )
    }
  }

  // UPDATED: Function to select a driver and navigate to driver details
  const selectDriver = (driver) => {
    console.log("Driver selected:", driver.username, "ID:", driver.id)

    try {
      const pickupLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      // Prepare navigation parameters
      const navigationParams = {
        driverData: JSON.stringify(driver),
        pickupLat: pickupLocation.latitude.toString(),
        pickupLng: pickupLocation.longitude.toString(),
        destination: driver.destination || destinationQuery || "Current Location",
      }

      console.log("Navigating to driver details with params:", navigationParams)

      // Navigate to driver details screen
      router.push({
        pathname: "/driver-details-screen",
        params: navigationParams,
      })
    } catch (error) {
      console.error("Error navigating to driver details:", error)
      Alert.alert("Navigation Error", "Unable to open driver details. Please try again.")
    }
  }

  // UPDATED: Function to handle marker press (alternative to callout)
  const handleDriverMarkerPress = (driver) => {
    console.log("Driver marker pressed:", driver.username)
    selectDriver(driver)
  }

  // FIXED: Function to navigate to first available driver details
  const navigateToFirstDriverDetails = () => {
    if (nearbyDrivers.length > 0) {
      // Navigate to the first driver in the list
      selectDriver(nearbyDrivers[0])
    } else {
      Alert.alert("No Drivers", "No drivers available to view details.")
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

      // Clear AsyncStorage
      await AsyncStorage.clear()
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Error", "Failed to logout")
    }
  }

  // Navigation handlers
  const navigateToHome = () => {
    router.push("/map")
  }

  const navigateToRides = () => {
    router.push("/rides")
  }

  const navigateToProfile = () => {
    router.push("/accounts")
  }

  // Handle search input submission
  const handleSearchSubmit = () => {
    if (destinationQuery.trim()) {
      searchForDriversByLocation()
    } else {
      Alert.alert("Error", "Please enter a destination location")
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
    <View style={{ flex: 1 }}>
      {errorMsg ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-500 text-lg font-medium mb-4">{errorMsg}</Text>
          <Text className="text-gray-600 text-center">
            This app needs location permissions to work properly. Please enable location services in your device
            settings.
          </Text>
        </View>
      ) : location ? (
        <>
          {/* Map View */}
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
            showsUserLocation={true}
            followsUserLocation={false}
            showsMyLocationButton={false}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
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

            {/* Driver markers - UPDATED with better navigation */}
            {nearbyDrivers.map((driver) => {
              const latitude = Number.parseFloat(driver.latitude)
              const longitude = Number.parseFloat(driver.longitude)

              if (isNaN(latitude) || isNaN(longitude)) {
                console.warn("Invalid driver coordinates:", driver)
                return null
              }

              return (
                <Marker
                  key={driver.id || `driver-${Math.random()}`}
                  coordinate={{
                    latitude: latitude,
                    longitude: longitude,
                  }}
                  title={driver.username || "Driver"}
                  description={`${driver.vehicle_model || "Vehicle"} (${driver.vehicle_color || "N/A"})`}
                  pinColor="green"
                  onPress={() => handleDriverMarkerPress(driver)}
                >
                  <Callout tooltip onPress={() => selectDriver(driver)}>
                    <View className="bg-white p-3 rounded-lg shadow-md" style={{ width: 220 }}>
                      <Text className="font-bold text-lg text-center mb-2">{driver.username || "Driver"}</Text>

                      <View className="mb-2">
                        <Text className="text-gray-700 font-medium">{driver.vehicle_model || "Vehicle"}</Text>
                        <Text className="text-gray-600 text-sm">
                          {driver.vehicle_color || "N/A"} • {driver.vehicle_plate || "N/A"}
                        </Text>
                      </View>

                      <View className="mb-2">
                        <Text className="text-gray-600 text-sm">📍 {driver.location || "Not specified"}</Text>
                        <Text className="text-gray-600 text-sm">📏 {driver.distance || "1.0"} km away</Text>
                      </View>

                      <View className="border-t border-gray-200 pt-2 mb-3">
                        <Text className="text-blue-600 font-bold text-center text-xl">
                          ${driver.fare || "15.00"}</Text>
                      </View>

                      <TouchableOpacity
                        className="bg-blue-500 py-2 px-4 rounded-lg"
                        onPress={() => selectDriver(driver)}
                      >
                        <Text className="text-white text-center font-medium">View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </Callout>
                </Marker>
              )
            })}
          </MapView>

          {/* Header */}
          <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <View className="flex-row justify-between items-center p-4 mx-4 mt-2 bg-white rounded-lg shadow-md">
              <View>
                <Text className="text-gray-500 font-bold text-xl">Welcome, {user ? user.username : "User"}</Text>
                <Text className="text-gray-400 text-sm">Where would you like to go?</Text>
              </View>
              <TouchableOpacity className="p-2" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Destination Search Bar - Updated for text-based search */}
          <View style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
            <View className="px-4 py-2 mx-4 mt-2">
              <View className="flex-row items-center bg-white rounded-full px-4 py-2 shadow-md">
                <Ionicons name="location" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800"
                  placeholder="Enter destination (e.g., New York, NY)"
                  value={destinationQuery}
                  onChangeText={setDestinationQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchSubmit}
                />
                {searchingDrivers ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <TouchableOpacity onPress={handleSearchSubmit}>
                    <Ionicons name="search" size={24} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Instructions */}
              <View className="bg-blue-50 rounded-lg mt-2 p-3">
                <Text className="text-blue-700 text-sm text-center">
                  💡 Enter a city or location to find available drivers in that area
                </Text>
              </View>
            </View>
          </View>

          {/* Floating Action Button - My Location */}
          <TouchableOpacity
            onPress={centerOnUserLocation}
            style={{ position: "absolute", right: 16, top: 220 }}
            className="bg-white p-3 rounded-full shadow-md"
          >
            <Ionicons name="locate" size={24} color="#3b82f6" />
          </TouchableOpacity>

          {/* Bottom Sheet - Updated for location-based search */}
          <View style={{ position: "absolute", bottom: 100, left: 0, right: 0 }}>
            <BottomSheetComponent
              onSearchDrivers={searchForDriversByLocation}
              searchingDrivers={searchingDrivers}
              onFindAllDrivers={searchForAllDrivers}
              destinationQuery={destinationQuery}
              driversFound={nearbyDrivers.length}
            />
          </View>

          {/* Bottom Navigation */}
          <SafeAreaView style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <View className="flex-row justify-between items-center bg-white p-4 mx-4 mb-4 rounded-lg shadow-md">
              <TouchableOpacity className="flex items-center" onPress={navigateToHome}>
                <Ionicons name="home-outline" size={24} color="#3b82f6" />
                <Text className="text-xs mt-1 text-blue-500">Home</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex items-center" onPress={navigateToRides}>
                <Ionicons name="car-outline" size={24} color="#3b82f6" />
                <Text className="text-xs mt-1 text-blue-500">Rides</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex items-center" onPress={navigateToProfile}>
                <Ionicons name="person-outline" size={24} color="#3b82f6" />
                <Text className="text-xs mt-1 text-blue-500">Profile</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Search Results Message - UPDATED with better driver selection */}
          {driversSearched && !searchingDrivers && (
            <View style={{ position: "absolute", top: "45%", left: 0, right: 0 }}>
              <View className="bg-white mx-4 p-4 rounded-lg shadow-md">
                {nearbyDrivers.length > 0 ? (
                  <View>
                    <Text className="text-center text-green-600 text-lg font-bold">
                      🚗 {nearbyDrivers.length} Driver{nearbyDrivers.length > 1 ? "s" : ""} Found!
                    </Text>
                    <Text className="text-center text-gray-600 mt-2">
                      {destinationQuery ? `Available in ${destinationQuery}` : "Available near you"}
                    </Text>
                    <Text className="text-center text-gray-500 text-sm mt-1">
                      Tap on a driver marker to view details and book
                    </Text>

                    {/* Show list of drivers for quick selection */}
                    <View className="mt-3 space-y-2">
                      {nearbyDrivers.slice(0, 3).map((driver, index) => (
                        <TouchableOpacity
                          key={driver.id || index}
                          className="bg-blue-50 p-3 rounded-lg flex-row justify-between items-center"
                          onPress={() => selectDriver(driver)}
                        >
                          <View className="flex-1">
                            <Text className="font-medium text-gray-800">{driver.username}</Text>
                            <Text className="text-sm text-gray-600">
                              {driver.vehicle_model} • {driver.distance} km
                            </Text>
                          </View>
                          <Text className="text-blue-600 font-bold">₵{driver.fare}</Text>
                        </TouchableOpacity>
                      ))}

                      {nearbyDrivers.length > 3 && (
                        <Text className="text-center text-gray-500 text-sm mt-2">
                          +{nearbyDrivers.length - 3} more drivers available on map
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text className="text-center text-orange-600 text-lg font-bold">🚗 No Drivers Available</Text>
                    <Text className="text-center text-gray-600 mt-2">
                      {destinationQuery ? `No drivers found in ${destinationQuery}` : "No drivers available nearby"}
                    </Text>
                    <TouchableOpacity
                      className="bg-blue-500 py-2 px-4 rounded-lg mt-3"
                      onPress={destinationQuery ? searchForDriversByLocation : searchForAllDrivers}
                    >
                      <Text className="text-white text-center font-medium">Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-gray-500 py-2 px-4 rounded-lg mt-2"
                      onPress={() => {
                        setDestinationQuery("")
                        setDriversSearched(false)
                        setNearbyDrivers([])
                      }}
                    >
                      <Text className="text-white text-center font-medium">Clear Search</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Waiting for location data...</Text>
        </View>
      )}
    </View>
  )
}
