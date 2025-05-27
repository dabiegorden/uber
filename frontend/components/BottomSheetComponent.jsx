"use client"

import "react-native-get-random-values" // Must be first import
import { useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from "react-native"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import BottomSheet from "@gorhom/bottom-sheet"
import { GestureHandlerRootView } from "react-native-gesture-handler"

const BASE_URL = "http://192.168.42.161:8080"
const GOOGLE_PLACES_API_KEY = "AIzaSyAqmJNttn7mi2WP30NgfpA60OjrfVGKlSE"

const BottomSheetComponent = ({ onSearchDrivers, searchingDrivers, onFindAllDrivers }) => {
  const bottomSheetRef = useRef(null)
  const [destination, setDestination] = useState(null)
  const [fare, setFare] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)

  // Generate session token for Google Places API
  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Search places using Google Places API
  const searchPlaces = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([])
      return
    }

    setSearchingPlaces(true)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${generateSessionToken()}`,
      )

      const data = await response.json()

      if (data.status === "OK") {
        setSearchResults(data.predictions || [])
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

  // Get place details from place_id
  const getPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`,
      )

      const data = await response.json()

      if (data.status === "OK") {
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

  const calculateFare = async (destinationLocation) => {
    if (!destinationLocation) return

    setCalculating(true)
    try {
      // Get current user location from profile
      const locationResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      const locationData = await locationResponse.json()

      if (!locationData.success || !locationData.user.latitude || !locationData.user.longitude) {
        console.error("Could not get current location")
        return
      }

      const currentLocation = {
        latitude: locationData.user.latitude,
        longitude: locationData.user.longitude,
      }

      // Calculate fare using the updated endpoint
      const response = await fetch(`${BASE_URL}/api/rides/calculate-fare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupLocation: currentLocation,
          dropoffLocation: destinationLocation,
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFare(data)
      } else {
        console.error("Fare calculation failed:", data.message)
      }
    } catch (error) {
      console.error("Error calculating fare:", error)
    } finally {
      setCalculating(false)
    }
  }

  const handlePlaceSelect = async (place) => {
    setSearchQuery(place.description)
    setSearchResults([])

    try {
      const placeDetails = await getPlaceDetails(place.place_id)

      if (placeDetails) {
        setDestination({
          name: place.description,
          location: placeDetails,
        })
        calculateFare(placeDetails)
      }
    } catch (error) {
      console.error("Error handling place selection:", error)
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={["15%", "50%", "75%"]}
        handleIndicatorStyle={{ backgroundColor: "#CCCCCC", width: 50 }}
        backgroundStyle={{ backgroundColor: "white" }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Where to?</Text>

          {/* Custom search input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter destination"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text)
                searchPlaces(text)
              }}
            />
            {searchingPlaces && <ActivityIndicator size="small" color="#3B82F6" style={styles.searchLoader} />}
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.slice(0, 5).map((result) => (
                <TouchableOpacity
                  key={result.place_id}
                  style={styles.resultItem}
                  onPress={() => handlePlaceSelect(result)}
                >
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.resultIcon} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultMainText}>
                      {result.structured_formatting?.main_text || result.description}
                    </Text>
                    <Text style={styles.resultSecondaryText}>{result.structured_formatting?.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {calculating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Calculating fare...</Text>
            </View>
          )}

          {fare && (
            <View style={styles.fareContainer}>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance:</Text>
                <Text style={styles.fareValue}>{fare.distance.toFixed(2)} km</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Base Fare:</Text>
                <Text style={styles.fareValue}>${fare.breakdown.baseFare.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance Fare:</Text>
                <Text style={styles.fareValue}>${fare.breakdown.distanceFare.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRowTotal}>
                <Text style={styles.fareLabelTotal}>Total Fare:</Text>
                <Text style={styles.fareValueTotal}>${fare.fare.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.searchButton} onPress={onSearchDrivers} disabled={searchingDrivers}>
            {searchingDrivers ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.searchButtonText}>Find Nearby Drivers</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.allDriversButton} onPress={onFindAllDrivers} disabled={searchingDrivers}>
            {searchingDrivers ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <MaterialIcons name="people" size={20} color="#3B82F6" />
                <Text style={styles.allDriversButtonText}>Show All Available Drivers</Text>
              </>
            )}
          </TouchableOpacity>

          {destination && (
            <View style={styles.destinationContainer}>
              <Text style={styles.destinationLabel}>Selected Destination:</Text>
              <Text style={styles.destinationText}>{destination.name}</Text>
            </View>
          )}
        </View>
      </BottomSheet>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  searchContainer: {
    position: "relative",
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  searchLoader: {
    position: "absolute",
    right: 15,
    top: 12,
  },
  resultsContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 15,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultMainText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  resultSecondaryText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  searchButton: {
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  allDriversButton: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  allDriversButtonText: {
    color: "#3B82F6",
    fontWeight: "bold",
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: "#666",
  },
  fareContainer: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fareRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  fareLabel: {
    color: "#4B5563",
  },
  fareValue: {
    color: "#1F2937",
    fontWeight: "500",
  },
  fareLabelTotal: {
    color: "#1F2937",
    fontWeight: "bold",
  },
  fareValueTotal: {
    color: "#3B82F6",
    fontWeight: "bold",
  },
  destinationContainer: {
    backgroundColor: "#EBF8FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  destinationLabel: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  destinationText: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
  },
})

export default BottomSheetComponent
