"use client"

import { useRef, useState } from "react"
import { View, Text, TouchableOpacity, Dimensions, Animated, Image, Platform, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { GestureHandlerRootView, PanGestureHandler, State } from "react-native-gesture-handler"
import { useRouter } from "expo-router"
import { usePathname } from "expo-router"

// Assuming the image is imported correctly
import image2 from "../assets/images/image2.png"

const { height, width } = Dimensions.get("window")

const BOTTOM_SHEET_MIN_HEIGHT = 250
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.85
const BOTTOM_SHEET_SNAP_POINTS = {
  CLOSED: 0,
  PEEK: BOTTOM_SHEET_MIN_HEIGHT,
  OPEN: BOTTOM_SHEET_MAX_HEIGHT,
}

const BottomSheetComponent = ({ onSearchDrivers, searchingDrivers }) => {
  const bottomSheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_SNAP_POINTS.PEEK)).current
  const [expanded, setExpanded] = useState(false)
  const panY = useRef(new Animated.Value(0)).current
  const router = useRouter()
  const pathname = usePathname()

  // Function to snap the bottom sheet to a specific height
  const snapToHeight = (toValue) => {
    Animated.spring(bottomSheetHeight, {
      toValue,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start()

    setExpanded(toValue === BOTTOM_SHEET_SNAP_POINTS.OPEN)
  }

  // Handler for gesture events
  const onGestureEvent = Animated.event([{ nativeEvent: { translationY: panY } }], { useNativeDriver: false })

  // Handler for when gesture ends
  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent
      const currentHeight = bottomSheetHeight.__getValue()

      // Determine direction and distance of swipe
      if (translationY < -50) {
        // Swiping up significantly
        snapToHeight(BOTTOM_SHEET_SNAP_POINTS.OPEN)
      } else if (translationY > 50) {
        // Swiping down significantly
        snapToHeight(BOTTOM_SHEET_SNAP_POINTS.PEEK)
      } else {
        // Small movement, snap to nearest point
        const shouldOpen = currentHeight > (BOTTOM_SHEET_MIN_HEIGHT + BOTTOM_SHEET_MAX_HEIGHT) / 2
        snapToHeight(shouldOpen ? BOTTOM_SHEET_SNAP_POINTS.OPEN : BOTTOM_SHEET_SNAP_POINTS.PEEK)
      }

      // Reset the translation
      panY.setValue(0)
    }
  }

  // Update the bottom sheet height when drag happens
  const animatedHeight = Animated.add(
    bottomSheetHeight,
    panY.interpolate({
      inputRange: [-300, 300],
      outputRange: [150, -150], // Reduced range for smoother dragging
      extrapolate: "clamp",
    }),
  ).interpolate({
    inputRange: [BOTTOM_SHEET_MIN_HEIGHT, BOTTOM_SHEET_MAX_HEIGHT],
    outputRange: [BOTTOM_SHEET_MIN_HEIGHT, BOTTOM_SHEET_MAX_HEIGHT],
    extrapolate: "clamp",
  })

  const toggleExpanded = () => {
    snapToHeight(expanded ? BOTTOM_SHEET_SNAP_POINTS.PEEK : BOTTOM_SHEET_SNAP_POINTS.OPEN)
  }

  // Handle search for driver
  const handleSearchDrivers = () => {
    if (onSearchDrivers) {
      onSearchDrivers()
    }
  }

  return (
    <GestureHandlerRootView className="absolute h-full w-full z-10">
      <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
        <Animated.View
          className="absolute w-full bottom-0 bg-white rounded-t-3xl shadow-md"
          style={{ height: animatedHeight }}
        >
          {/* Handle indicator */}
          <TouchableOpacity className="items-center pt-3 pb-1" onPress={toggleExpanded} activeOpacity={0.7}>
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </TouchableOpacity>

          {/* Content */}
          <View className="flex-1 p-4">
            <View className="flex-1">
              {/* Find Drivers Button */}
              <TouchableOpacity
                className={`flex-row items-center justify-center bg-blue-500 p-4 rounded-lg mb-4 ${searchingDrivers ? "opacity-70" : ""}`}
                onPress={handleSearchDrivers}
                disabled={searchingDrivers}
              >
                {searchingDrivers ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 10 }} />
                ) : (
                  <Ionicons name="car-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
                )}
                <Text className="text-lg font-bold text-white">
                  {searchingDrivers ? "Finding Drivers..." : "Find Nearby Drivers"}
                </Text>
              </TouchableOpacity>

              {/* Ride Options */}
              <View className="flex-row items-center bg-gray-50 p-4 rounded-lg mb-4">
                <View className="w-16 h-16 rounded-lg bg-gray-200 justify-center items-center mr-3">
                  <Image source={image2} className="w-12 h-8 resize-contain" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">Rides</Text>
                  <Text className="text-sm text-gray-500 mt-1">Let's get moving</Text>
                </View>
              </View>

              {/* Calendar Connection */}
              <View className="flex-row items-center py-3 px-2 rounded-lg">
                <View className="w-10 h-10 rounded-lg bg-green-500 justify-center items-center mr-3">
                  <Ionicons name="calendar" size={24} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800">Always arrive on time</Text>
                  <Text className="text-sm text-gray-500 mt-0.5">Calendar connection makes it easy</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>

              {/* Expanded Content (only visible when expanded) */}
              {expanded && (
                <View className="mt-5">
                  <Text className="text-base font-bold mb-3 text-gray-800">Saved Places</Text>

                  <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                    <View className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center mr-3">
                      <Ionicons name="home-outline" size={20} color="#333" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-800">Home</Text>
                      <Text className="text-sm text-gray-500 mt-0.5">Add home address</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                    <View className="w-9 h-9 rounded-full bg-gray-100 justify-center items-center mr-3">
                      <Ionicons name="briefcase-outline" size={20} color="#333" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-800">Work</Text>
                      <Text className="text-sm text-gray-500 mt-0.5">Add work address</Text>
                    </View>
                  </TouchableOpacity>

                  <Text className="text-base font-bold mb-3 mt-5 text-gray-800">Recent Trips</Text>
                  <Text className="text-sm text-gray-500 mt-2 italic">No recent trips</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Tab Bar */}
          <View
            className={`flex-row justify-around border-t border-gray-100 pt-2 ${Platform.OS === "ios" ? "pb-6" : "pb-2"} bg-white`}
          >
            <TouchableOpacity
              className="items-center justify-center h-12 w-16"
              onPress={() => router.push("/(map)/map")}
            >
              <Ionicons
                name={pathname === "/(map)/map" ? "map" : "map-outline"}
                size={24}
                color={pathname === "/(map)/map" ? "#3b82f6" : "#777"}
              />
              <Text
                className={`text-xs mt-1 ${pathname === "/(map)/map" ? "text-blue-500 font-medium" : "text-gray-500"}`}
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center justify-center h-12 w-16"
              onPress={() => router.push("/(tabs)/rides")}
            >
              <Ionicons
                name={pathname === "/(tabs)/rides" ? "time" : "time-outline"}
                size={24}
                color={pathname === "/(tabs)/rides" ? "#3b82f6" : "#777"}
              />
              <Text
                className={`text-xs mt-1 ${pathname === "/(tabs)/rides" ? "text-blue-500 font-medium" : "text-gray-500"}`}
              >
                Rides
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center justify-center h-12 w-16"
              onPress={() => router.push("/(tabs)/accounts")}
            >
              <Ionicons
                name={pathname === "/(tabs)/accounts" ? "person-circle" : "person-circle-outline"}
                size={24}
                color={pathname === "/(tabs)/accounts" ? "#3b82f6" : "#777"}
              />
              <Text
                className={`text-xs mt-1 ${pathname === "/(tabs)/accounts" ? "text-blue-500 font-medium" : "text-gray-500"}`}
              >
                Account
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  )
}

export default BottomSheetComponent

