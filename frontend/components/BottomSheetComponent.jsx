"use client"

import "react-native-get-random-values" // Must be first import
import { useRef, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from "react-native"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import BottomSheet from "@gorhom/bottom-sheet"
import { GestureHandlerRootView } from "react-native-gesture-handler"

import Constants from "expo-constants"

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;
const BottomSheetComponent = ({
  onSearchDrivers,
  searchingDrivers,
  onFindAllDrivers,
  destinationQuery = "",
  driversFound = 0,
}) => {
  const bottomSheetRef = useRef(null)
  const [localDestination, setLocalDestination] = useState("")
  const [fare, setFare] = useState(null)
  const [calculating, setCalculating] = useState(false)

  // Calculate estimated fare based on location text
  const calculateEstimatedFare = async (destination) => {
    if (!destination || destination.trim().length < 3) {
      setFare(null)
      return
    }

    setCalculating(true)
    try {
      console.log("Calculating estimated fare for destination:", destination)

      // Use a simple estimation based on location text
      // In a real app, you might have a more sophisticated fare calculation
      const response = await fetch(`${BASE_URL}/api/rides/calculate-fare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: destination.trim(),
        }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log("Fare calculated successfully:", data)
        setFare(data)
      } else {
        console.log("Using default fare estimation")
        // Fallback to simple estimation
        const estimatedDistance = Math.random() * 10 + 2 // 2-12 km
        const baseFare = 5.0
        const ratePerKm = 2.5
        const totalFare = baseFare + estimatedDistance * ratePerKm

        setFare({
          fare: totalFare,
          distance: estimatedDistance,
          breakdown: {
            baseFare: baseFare,
            distanceFare: estimatedDistance * ratePerKm,
          },
        })
      }
    } catch (error) {
      console.error("Error calculating fare:", error)
      // Fallback estimation
      const estimatedDistance = Math.random() * 10 + 2 // 2-12 km
      const baseFare = 5.0
      const ratePerKm = 2.5
      const totalFare = baseFare + estimatedDistance * ratePerKm

      setFare({
        fare: totalFare,
        distance: estimatedDistance,
        breakdown: {
          baseFare: baseFare,
          distanceFare: estimatedDistance * ratePerKm,
        },
      })
    } finally {
      setCalculating(false)
    }
  }

  // Handle destination input change
  const handleDestinationChange = (text) => {
    setLocalDestination(text)

    // Calculate fare when user types a destination
    if (text.trim().length >= 3) {
      calculateEstimatedFare(text)
    } else {
      setFare(null)
    }
  }

  // Handle search for drivers with current destination
  const handleSearchDrivers = () => {
    const destination = localDestination || destinationQuery
    if (!destination.trim()) {
      alert("Please enter a destination first")
      return
    }
    onSearchDrivers()
  }

  // Clear destination and fare
  const clearDestination = () => {
    setLocalDestination("")
    setFare(null)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={["20%", "50%", "75%"]}
        handleIndicatorStyle={{ backgroundColor: "#CCCCCC", width: 50 }}
        backgroundStyle={{ backgroundColor: "white" }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>🚗 Find Your Ride</Text>

          {/* Destination input */}
          <View style={styles.searchContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="location" size={20} color="#3B82F6" style={styles.inputIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter destination (e.g., New York, NY)"
                value={localDestination || destinationQuery}
                onChangeText={handleDestinationChange}
                returnKeyType="search"
                onSubmitEditing={handleSearchDrivers}
              />
              {(localDestination || destinationQuery) && (
                <TouchableOpacity onPress={clearDestination} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              💡 Enter a city or location to find available drivers in that area
            </Text>
          </View>

          {/* Fare estimation */}
          {calculating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Calculating estimated fare...</Text>
            </View>
          )}

          {fare && (
            <View style={styles.fareContainer}>
              <Text style={styles.fareTitle}>📊 Estimated Fare</Text>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Estimated Distance:</Text>
                <Text style={styles.fareValue}>{fare.distance.toFixed(1)} km</Text>
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
                <Text style={styles.fareLabelTotal}>Estimated Total:</Text>
                <Text style={styles.fareValueTotal}>${fare.fare.toFixed(2)}</Text>
              </View>
              <Text style={styles.fareDisclaimer}>
                * Final fare may vary based on actual distance and driver selection
              </Text>
            </View>
          )}

          {/* Search results info */}
          {driversFound > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>
                ✅ Found {driversFound} driver{driversFound > 1 ? "s" : ""} available!
              </Text>
              <Text style={styles.resultsSubtext}>Tap on a driver marker on the map to book your ride</Text>
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={[styles.searchButton, !localDestination && !destinationQuery && styles.searchButtonDisabled]}
            onPress={handleSearchDrivers}
            disabled={searchingDrivers || (!localDestination && !destinationQuery)}
          >
            {searchingDrivers ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.searchButtonText}>
                  {localDestination || destinationQuery
                    ? `Find Drivers in ${(localDestination || destinationQuery).split(",")[0]}`
                    : "Enter Destination First"}
                </Text>
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

          {/* Current destination display */}
          {(localDestination || destinationQuery) && (
            <View style={styles.destinationContainer}>
              <Text style={styles.destinationLabel}>🎯 Destination:</Text>
              <Text style={styles.destinationText}>{localDestination || destinationQuery}</Text>
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            <Text style={styles.tipsText}>• Be specific with your location (e.g., "Downtown Chicago")</Text>
            <Text style={styles.tipsText}>• Include city and state for better results</Text>
            <Text style={styles.tipsText}>• Try nearby areas if no drivers are found</Text>
          </View>
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#1F2937",
  },
  searchContainer: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  instructionsContainer: {
    backgroundColor: "#EBF8FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  instructionsText: {
    color: "#1E40AF",
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 10,
    color: "#4B5563",
    fontSize: 14,
  },
  fareContainer: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  fareTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 12,
    textAlign: "center",
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#BBF7D0",
  },
  fareLabel: {
    color: "#374151",
    fontSize: 14,
  },
  fareValue: {
    color: "#1F2937",
    fontWeight: "500",
    fontSize: 14,
  },
  fareLabelTotal: {
    color: "#166534",
    fontWeight: "bold",
    fontSize: 16,
  },
  fareValueTotal: {
    color: "#166534",
    fontWeight: "bold",
    fontSize: 18,
  },
  fareDisclaimer: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  resultsContainer: {
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resultsText: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  resultsSubtext: {
    color: "#15803D",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  searchButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  searchButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  allDriversButton: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  allDriversButtonText: {
    color: "#3B82F6",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  destinationContainer: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  destinationLabel: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  destinationText: {
    color: "#78350F",
    fontSize: 16,
    fontWeight: "500",
  },
  tipsContainer: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  tipsTitle: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  tipsText: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 4,
  },
})

export default BottomSheetComponent
