"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import BottomSheetComponent from "../../components/BottomSheetComponent"

const BASE_URL = "http://192.168.42.161:8080"
const GOOGLE_PLACES_API_KEY = "AIzaSyAqmJNttn7mi2WP30NgfpA60OjrfVGKlSE"

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

  // State for location search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)

  // Get user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching user profile...")
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

  // Get user's location - NO AUTOMATIC DRIVER FETCHING
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

        // Update location in backend
        await updateLocationInBackend(currentLocation.coords.latitude, currentLocation.coords.longitude)

        // DO NOT automatically fetch drivers - user must search explicitly
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
          updateLocationInBackend(newLocation.coords.latitude, newLocation.coords.longitude)
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

  // Function to update location in backend
  const updateLocationInBackend = async (latitude, longitude) => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/update-location`, {
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

      if (!response.ok) {
        console.warn("Failed to update location in backend:", await response.text())
      }
    } catch (error) {
      console.error("Failed to update location in backend:", error)
    }
  }

  // Function to search for places using Google Places API
  const searchPlaces = async (query) => {
    if (!query || query.length < 3) return

    setSearchingPlaces(true)

    try {
      console.log("Searching places for:", query)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${generateSessionToken()}`,
      )

      const data = await response.json()

      if (data.status === "OK") {
        console.log(`Found ${data.predictions.length} place predictions`)
        setSearchResults(data.predictions)
      } else {
        console.error("Places API error:", data.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error("Error searching places:", error)
      setSearchResults([])
    } finally {
      setSearchingPlaces(false)
    }
  }

  // Generate a session token for Places API
  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Get place details from place_id
  const getPlaceDetails = async (placeId) => {
    try {
      console.log("Getting place details for:", placeId)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`,
      )

      const data = await response.json()

      if (data.status === "OK") {
        console.log("Place details retrieved successfully")
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        }
      } else {
        console.error("Place details API error:", data.status)
        return null
      }
    } catch (error) {
      console.error("Error getting place details:", error)
      return null
    }
  }

  // Handle place selection
  const handlePlaceSelect = async (place) => {
    console.log("Place selected:", place.description)
    setSearchQuery(place.description)
    setSearchResults([])

    try {
      const placeDetails = await getPlaceDetails(place.place_id)

      if (placeDetails) {
        console.log("Place coordinates:", placeDetails.latitude, placeDetails.longitude)
        setSelectedPlace(placeDetails)

        mapRef.current?.animateToRegion(
          {
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        )
      } else {
        Alert.alert("Error", "Could not get location details. Please try another location.")
      }
    } catch (error) {
      console.error("Error handling place selection:", error)
      Alert.alert("Error", "Failed to get location details. Please try again.")
    }
  }

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

  // Function to search for drivers - ONLY CALLED EXPLICITLY BY USER
  const searchForDrivers = async () => {
    if (!location && !selectedPlace) {
      Alert.alert("Error", "Your location is not available")
      return
    }

    setSearchingDrivers(true)
    setDriversSearched(true)
    setNearbyDrivers([]) // Clear previous results

    const searchLocation = selectedPlace || {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }

    try {
      console.log("User explicitly searching for drivers near:", searchLocation.latitude, searchLocation.longitude)

      const response = await fetch(`${BASE_URL}/api/rides/all-available-drivers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      const data = await response.json()
      console.log("Drivers search response:", data)

      if (response.ok && data.success) {
        console.log(`Found ${data.drivers?.length || 0} available drivers`)

        if (data.drivers && data.drivers.length > 0) {
          const processedDrivers = data.drivers.map((driver) => {
            // Place drivers randomly around the search location
            const latOffset = (Math.random() - 0.5) * 0.02 // Random offset within ~1km
            const lngOffset = (Math.random() - 0.5) * 0.02
            const driverLat = searchLocation.latitude + latOffset
            const driverLng = searchLocation.longitude + lngOffset

            // Calculate distance and fare
            const distance = calculateDistance(searchLocation.latitude, searchLocation.longitude, driverLat, driverLng)
            const baseFare = 5.0
            const ratePerKm = 2.5
            const calculatedFare = baseFare + distance * ratePerKm

            return {
              ...driver,
              latitude: driverLat,
              longitude: driverLng,
              fare: calculatedFare.toFixed(2),
              distance: distance.toFixed(1),
            }
          })

          setNearbyDrivers(processedDrivers)

          // Fit map to show all drivers
          const allCoordinates = [searchLocation, ...processedDrivers]
          fitAllMarkers(allCoordinates)
        } else {
          // Show "drivers are busy" message
          Alert.alert("Drivers Busy", "All drivers are busy now. Please try again later.")
          setNearbyDrivers([])
        }
      } else {
        console.error("Failed to fetch drivers:", data.message)
        Alert.alert("Drivers Busy", "All drivers are busy now. Please try again later.")
        setNearbyDrivers([])
      }
    } catch (error) {
      console.error("Error searching for drivers:", error)
      Alert.alert("Drivers Busy", "All drivers are busy now. Please try again later.")
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

  // Function to select a driver
  const selectDriver = (driver) => {
    console.log("Driver selected:", driver.username)

    const currentLocation = selectedPlace || {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }

    router.push({
      pathname: "/driver-details",
      params: {
        driverData: JSON.stringify(driver),
        pickupLat: currentLocation?.latitude,
        pickupLng: currentLocation?.longitude,
      },
    })
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

            {/* Selected place marker */}
            {selectedPlace && (
              <Marker
                coordinate={{
                  latitude: selectedPlace.latitude,
                  longitude: selectedPlace.longitude,
                }}
                title="Selected Location"
                description={searchQuery}
                pinColor="red"
              />
            )}

            {/* Driver markers - ONLY SHOWN AFTER USER SEARCHES */}
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
                >
                  <Callout tooltip onPress={() => selectDriver(driver)}>
                    <View className="bg-white p-3 rounded-lg shadow-md" style={{ width: 180 }}>
                      <Text className="font-bold">{driver.username || "Driver"}</Text>
                      <Text className="text-gray-700">{driver.vehicle_model || "Vehicle"}</Text>
                      <Text className="text-gray-700">
                        {driver.vehicle_color || "N/A"} · {driver.vehicle_plate || "N/A"}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">{driver.distance || "1.0"} km away</Text>
                      <Text className="text-blue-600 font-bold mt-1">${driver.fare || "15.00"}</Text>
                      <TouchableOpacity
                        className="mt-2 bg-blue-500 py-2 px-4 rounded-lg"
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
              </View>
              <TouchableOpacity className="p-2" onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Search Bar */}
          <View style={{ position: "absolute", top: 100, left: 0, right: 0 }}>
            <View className="px-4 py-2 mx-4 mt-2">
              <View className="flex-row items-center bg-white rounded-full px-4 py-2 shadow-md">
                <Ionicons name="search" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800"
                  placeholder="Search for destinations..."
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text)
                    if (text.length > 2) {
                      searchPlaces(text)
                    } else {
                      setSearchResults([])
                    }
                  }}
                  returnKeyType="search"
                />
                {searchingPlaces ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <TouchableOpacity onPress={searchForDrivers}>
                    <Ionicons name="arrow-forward-circle" size={24} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <View className="bg-white rounded-lg mt-1 shadow-md">
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={result.place_id}
                      className={`p-3 ${index !== searchResults.length - 1 ? "border-b border-gray-200" : ""}`}
                      onPress={() => handlePlaceSelect(result)}
                    >
                      <Text className="font-medium">
                        {result.structured_formatting?.main_text || result.description}
                      </Text>
                      <Text className="text-gray-500 text-sm">{result.structured_formatting?.secondary_text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Floating Action Button - My Location */}
          <TouchableOpacity
            onPress={centerOnUserLocation}
            style={{ position: "absolute", right: 16, top: 200 }}
            className="bg-white p-3 rounded-full shadow-md"
          >
            <Ionicons name="locate" size={24} color="#3b82f6" />
          </TouchableOpacity>

          {/* Bottom Sheet */}
          <View style={{ position: "absolute", bottom: 100, left: 0, right: 0 }}>
            <BottomSheetComponent
              onSearchDrivers={searchForDrivers}
              searchingDrivers={searchingDrivers}
              onFindAllDrivers={searchForDrivers}
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

          {/* No Drivers Message */}
          {driversSearched && nearbyDrivers.length === 0 && !searchingDrivers && (
            <View style={{ position: "absolute", top: "50%", left: 0, right: 0 }}>
              <View className="bg-white mx-4 p-4 rounded-lg shadow-md">
                <Text className="text-center text-gray-600 text-lg">🚗 All drivers are busy now</Text>
                <Text className="text-center text-gray-500 mt-2">Please try again later</Text>
                <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-lg mt-3" onPress={searchForDrivers}>
                  <Text className="text-white text-center font-medium">Try Again</Text>
                </TouchableOpacity>
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
