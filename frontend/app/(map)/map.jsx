"use client"

import { useState, useEffect, useRef } from "react"
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
  TextInput,
  Modal,
  Image,
  ScrollView
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons, MaterialIcons, FontAwesome5, AntDesign } from "@expo/vector-icons"
import { router } from "expo-router"
import BottomSheetComponent from "../../components/BottomSheetComponent"
import { useStripe } from "@stripe/stripe-react-native"

// Set the base URL for all fetch requests
const BASE_URL = "http://192.168.137.5:8080"
// Google Places API Key
const GOOGLE_PLACES_API_KEY = "AIzaSyAqmJNttn7mi2WP30NgfpA60OjrfVGKlSE"

export default function Map(){
  // State for location and map
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  
  // State for user
  const [user, setUser] = useState(null)
  
  // State for drivers
  const [nearbyDrivers, setNearbyDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [searchingDrivers, setSearchingDrivers] = useState(false)
  
  // State for location search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [destination, setDestination] = useState(null)
  
  // State for payment flow
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [currentRide, setCurrentRide] = useState(null)
  
  // State for ride details
  const [rideDetails, setRideDetails] = useState({
    distance: 0,
    duration: 0,
    fare: 0
  })

  // Initialize Stripe
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  // Get user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("Fetching user profile...");
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        const data = await response.json()

        if (response.ok && data.success) {
          console.log("User profile fetched successfully:", data.user.username);
          setUser(data.user)
        } else {
          console.error("Failed to fetch user profile:", data.message);
          // If not authenticated, redirect to login
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
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          setLoading(false)
          return
        }

        console.log("Getting current location...");
        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        console.log("Current location:", currentLocation.coords.latitude, currentLocation.coords.longitude);
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
      const response = await fetch(`${BASE_URL}/api/update-location`, {
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
        console.warn("Failed to update location in backend:", await response.text());
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
      console.log("Searching places for:", query);
      // Using Google Places Autocomplete API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${generateSessionToken()}`
      )
      
      const data = await response.json()
      
      if (data.status === 'OK') {
        console.log(`Found ${data.predictions.length} place predictions`);
        setSearchResults(data.predictions)
      } else {
        console.error('Places API error:', data.status)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching places:', error)
      setSearchResults([])
    } finally {
      setSearchingPlaces(false)
    }
  }
  
  // Generate a session token for Places API
  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
  
  // Get place details from place_id
  const getPlaceDetails = async (placeId) => {
    try {
      console.log("Getting place details for:", placeId);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`
      )
      
      const data = await response.json()
      
      if (data.status === 'OK') {
        console.log("Place details retrieved successfully");
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng
        }
      } else {
        console.error('Place details API error:', data.status)
        return null
      }
    } catch (error) {
      console.error('Error getting place details:', error)
      return null
    }
  }
  
  // Handle place selection
  const handlePlaceSelect = async (place) => {
    console.log("Place selected:", place.description);
    setSearchQuery(place.description)
    setSearchResults([])
    
    try {
      const placeDetails = await getPlaceDetails(place.place_id)
      
      if (placeDetails) {
        console.log("Place coordinates:", placeDetails.latitude, placeDetails.longitude);
        setSelectedPlace(placeDetails)
        
        // Animate map to the selected location
        mapRef.current?.animateToRegion({
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500)
        
        // Search for drivers near the selected location
        await searchNearbyDrivers(placeDetails)
      } else {
        Alert.alert("Error", "Could not get location details. Please try another location.");
      }
    } catch (error) {
      console.error("Error handling place selection:", error);
      Alert.alert("Error", "Failed to get location details. Please try again.");
    }
  }

  // Function to search for nearby drivers
// Update the searchNearbyDrivers function in map.tsx

const searchNearbyDrivers = async (customLocation = null) => {
  if (!location && !selectedPlace && !customLocation) {
    Alert.alert("Error", "Your location is not available");
    return;
  }

  setSearchingDrivers(true);
  
  // Use provided location, selected place coordinates, or current location
  const searchLocation = customLocation || selectedPlace || {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  };

  try {
    console.log("Searching for drivers near:", searchLocation.latitude, searchLocation.longitude);
    
    const response = await fetch(`${BASE_URL}/api/rides/nearby-drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        radius: 5, // 5km radius
      }),
      credentials: "include",
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`Found ${data.drivers?.length || 0} nearby drivers`);
      
      if (data.drivers && data.drivers.length > 0) {
        // Log the first driver to debug
        console.log("Sample driver data:", data.drivers[0]);
        
        // Make sure each driver has a fare and distance
        const driversWithDetails = data.drivers.map(driver => ({
          ...driver,
          fare: driver.fare || (Math.random() * 20 + 10).toFixed(2), // Add fare if not present
          distance: driver.distance || (Math.random() * 3 + 0.5).toFixed(1) // Add distance if not present
        }));
        
        setNearbyDrivers(driversWithDetails);

        // If drivers found, adjust map to show all markers
        fitAllMarkers([
          ...driversWithDetails,
          searchLocation,
        ]);
      } else {
        console.log("No nearby drivers found, fetching all available drivers");
        await fetchAllAvailableDrivers();
      }
    } else {
      console.log("Failed to find nearby drivers, fetching all available drivers");
      await fetchAllAvailableDrivers();
    }
  } catch (error) {
    console.error("Error searching for drivers:", error);
    // If error occurs, fetch all available drivers
    await fetchAllAvailableDrivers();
  } finally {
    setSearchingDrivers(false);
  }
};

  // Function to fetch all available drivers
// Update the fetchAllAvailableDrivers function in map.tsx

const fetchAllAvailableDrivers = async () => {
  setSearchingDrivers(true);
  
  try {
    console.log("Fetching all available drivers");
    
    const response = await fetch(`${BASE_URL}/api/rides/all-available-drivers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`Found ${data.drivers?.length || 0} available drivers`);
      
      if (data.drivers && data.drivers.length > 0) {
        // Log the first driver to debug
        console.log("Sample driver data:", data.drivers[0]);
        
        // Process drivers to ensure they have valid coordinates
        const processedDrivers = data.drivers.map((driver) => {
          // Create a random offset from the user's location or selected place
          const baseLocation = selectedPlace || {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          
          // Check if driver has valid coordinates
          const hasValidCoordinates = 
            driver.latitude && 
            driver.longitude && 
            !isNaN(Number(driver.latitude)) && 
            !isNaN(Number(driver.longitude));
          
          // Generate random offsets between -0.01 and 0.01 (roughly 1km) if needed
          const latOffset = (Math.random() * 0.02 - 0.01);
          const lngOffset = (Math.random() * 0.02 - 0.01);
          
          return {
            ...driver,
            latitude: hasValidCoordinates ? 
              Number(driver.latitude) : 
              Number(baseLocation.latitude) + latOffset,
            longitude: hasValidCoordinates ? 
              Number(driver.longitude) : 
              Number(baseLocation.longitude) + lngOffset,
            fare: driver.fare || (Math.random() * 20 + 10).toFixed(2), // Random fare between $10-$30
            distance: driver.distance || (Math.random() * 3 + 0.5).toFixed(1) // Random distance between 0.5-3.5km
          };
        });
        
        setNearbyDrivers(processedDrivers);

        // If drivers found, adjust map to show all markers
        const allCoordinates = [
          ...(selectedPlace ? [selectedPlace] : []),
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          },
          ...processedDrivers
        ];
        
        fitAllMarkers(allCoordinates);
      } else {
        Alert.alert("No Drivers", "No available drivers found in the system");
        // Generate mock drivers for testing
        generateMockDrivers();
      }
    } else {
      Alert.alert("Error", data.message || "Failed to find drivers");
      // Generate mock drivers for testing
      generateMockDrivers();
    }
  } catch (error) {
    console.error("Error fetching drivers:", error);
    Alert.alert("Error", "Failed to fetch drivers. Using simulated drivers instead.");
    
    // Generate mock drivers for testing
    generateMockDrivers();
  } finally {
    setSearchingDrivers(false);
  }
};

  // Helper function to generate mock drivers for testing
  const generateMockDrivers = () => {
    console.log("Generating mock drivers");
    
    const baseLocation = selectedPlace || {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    
    const mockDrivers = Array(5).fill(0).map((_, index) => {
      const latOffset = (Math.random() * 0.02 - 0.01);
      const lngOffset = (Math.random() * 0.02 - 0.01);
      
      return {
        id: `mock-${index}`,
        user_id: `mock-user-${index}`,
        username: `Driver ${index + 1}`,
        vehicle_model: ['Toyota Camry', 'Honda Civic', 'Tesla Model 3', 'Ford Escape', 'Chevrolet Malibu'][index % 5],
        vehicle_color: ['Black', 'White', 'Silver', 'Blue', 'Red'][index % 5],
        vehicle_plate: `ABC${1000 + index}`,
        latitude: Number.parseFloat(baseLocation.latitude) + latOffset,
        longitude: Number.parseFloat(baseLocation.longitude) + lngOffset,
        fare: (Math.random() * 20 + 10).toFixed(2),
        distance: (Math.random() * 3 + 0.5).toFixed(1)
      };
    });
    
    setNearbyDrivers(mockDrivers);
    
    // Fit all markers on the map
    const allCoordinates = [
      ...(selectedPlace ? [selectedPlace] : []),
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      },
      ...mockDrivers
    ];
    
    fitAllMarkers(allCoordinates);
  };

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
        console.error("Error fitting markers on map:", error);
      }
    }
  }

  // Function to center map on user's location
  const centerOnUserLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }

  // Function to select a driver and show payment modal
  const selectDriver = (driver) => {
    console.log("Driver selected:", driver.username);
    setSelectedDriver(driver);
    
    // Calculate fare based on distance
    const fare = parseFloat(driver.fare);
    setPaymentAmount(fare);
    
    // Set ride details
    setRideDetails({
      distance: parseFloat(driver.distance),
      duration: Math.round(parseFloat(driver.distance) * 3), // Rough estimate: 3 minutes per km
      fare: fare
    });
    
    setShowPaymentModal(true);
  }

  // Function to initialize Stripe payment sheet
  const initializePayment = async () => {
    if (!selectedDriver) return;
    
    setPaymentLoading(true);
    
    try {
      console.log("Initializing payment for amount:", paymentAmount);
      
      // Create payment intent on the server
      const response = await fetch(`${BASE_URL}/api/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: paymentAmount,
          driverId: selectedDriver.id,
          currency: "usd",
        }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.paymentIntent) {
        console.error("Failed to initialize payment:", data);
        Alert.alert("Error", data.message || "Failed to initialize payment");
        setPaymentLoading(false);
        return;
      }
      
      const { paymentIntent, ephemeralKey, customer } = data;
      
      console.log("Payment intent created successfully");
      
      // Initialize the payment sheet
      const { error } = await initPaymentSheet({
        merchantDisplayName: "RideShare App",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: user?.username || "",
        }
      });
      
      if (error) {
        console.error("Payment sheet initialization error:", error);
        Alert.alert("Error", error.message);
        setPaymentLoading(false);
        return;
      }
      
      console.log("Payment sheet initialized, presenting...");
      
      // Open the payment sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code === 'Canceled') {
          console.log("Payment canceled by user");
          // User canceled the payment - just close the modal
          setPaymentLoading(false);
          setShowPaymentModal(false);
          return;
        }
        
        console.error("Payment presentation error:", presentError);
        Alert.alert("Error", presentError.message);
        setPaymentLoading(false);
        return;
      }
      
      console.log("Payment successful, creating ride...");
      
      // Payment successful - create the ride
      await createRide();
      
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert("Error", "Failed to process payment. Please try again.");
      setPaymentLoading(false);
      
      // For testing, simulate successful payment
      if (process.env.NODE_ENV === 'development') {
        await createRide();
      }
    }
  }
  
  // Function to create a ride after successful payment
// Update the createRide function in map.tsx

const createRide = async () => {
  if (!selectedDriver || !location) return;
  
  try {
    // Use selected place coordinates if available, otherwise use current location
    const pickupLocation = selectedPlace || {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    
    // For a real app, you would have a destination selection
    // Here we're just using the same location with a small offset for demo
    const dropoffLocation = {
      latitude: pickupLocation.latitude + (Math.random() * 0.01 - 0.005),
      longitude: pickupLocation.longitude + (Math.random() * 0.01 - 0.005)
    };
    
    // Determine the correct driver ID to use
    const driverId = selectedDriver.id || selectedDriver.driver_id;
    
    console.log("Creating ride with driver:", driverId);
    console.log("Driver details:", selectedDriver);
    console.log("Pickup location:", pickupLocation);
    console.log("Dropoff location:", dropoffLocation);
    
    const response = await fetch(`${BASE_URL}/api/rides/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        driverId: driverId,
        pickupLocation: {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude
        },
        dropoffLocation: {
          latitude: dropoffLocation.latitude,
          longitude: dropoffLocation.longitude
        },
        fare: paymentAmount
      }),
      credentials: "include",
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log("Ride created successfully:", data);
      
      // If we have a ride ID, fetch the ride details
      if (data.rideId) {
        try {
          const rideResponse = await fetch(`${BASE_URL}/api/rides/${data.rideId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          const rideData = await rideResponse.json();
          
          if (rideResponse.ok && rideData.success) {
            setCurrentRide(rideData.ride);
          } else {
            // If we can't get ride details, create a basic ride object
            setCurrentRide({
              id: data.rideId,
              status: "requested",
              fare: paymentAmount
            });
          }
        } catch (error) {
          console.error("Error fetching ride details:", error);
          setCurrentRide({
            id: data.rideId,
            status: "requested",
            fare: paymentAmount
          });
        }
      } else {
        // If no ride ID, create a mock ride object
        setCurrentRide({
          id: Math.floor(Math.random() * 10000),
          status: "requested",
          fare: paymentAmount
        });
      }
      
      setPaymentLoading(false);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
    } else {
      console.error("Failed to create ride:", data);
      Alert.alert("Error", data.message || "Failed to create ride");
      setPaymentLoading(false);
    }
  } catch (error) {
    console.error("Create ride error:", error);
    Alert.alert("Error", "Failed to create ride. Please try again.");
    setPaymentLoading(false);
    
    // For testing, create a mock ride if the API fails
    if (process.env.NODE_ENV === 'development') {
      setCurrentRide({
        id: Math.floor(Math.random() * 10000),
        status: "requested",
        fare: paymentAmount
      });
      setShowPaymentModal(false);
      setShowSuccessModal(true);
    }
  }
}
  
  // Function to close success modal and go to home
  const handleRideComplete = () => {
    setShowSuccessModal(false);
    setSelectedDriver(null);
    setNearbyDrivers([]);
    setSelectedPlace(null);
    setSearchQuery("");
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
      });

      // Navigate to login
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  }

  // Navigation handlers
  const navigateToHome = () => {
    router.push("/map");
  }

  const navigateToRides = () => {
    router.push("/rides");
  }

  const navigateToProfile = () => {
    router.push("/accounts");
  }

  // Render payment modal
  const renderPaymentModal = () => {
    if (!selectedDriver) return null;
    
    return (
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-md p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Ride Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <AntDesign name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-500 mb-1">Driver</Text>
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-2 rounded-full mr-3">
                  <Ionicons name="person" size={24} color="#3b82f6" />
                </View>
                <View>
                  <Text className="font-bold text-lg">{selectedDriver.username || "Driver"}</Text>
                  <Text className="text-gray-600">
                    {selectedDriver.vehicle_model || "Vehicle"} • {selectedDriver.vehicle_color || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
            
            {selectedDriver.vehicle_image && (
              <View className="mb-4">
                <Text className="text-gray-500 mb-1">Vehicle</Text>
                <Image
                  source={{ uri: `${BASE_URL}${selectedDriver.vehicle_image}` }}
                  className="w-full h-40 rounded-lg"
                  resizeMode="cover"
                />
              </View>
            )}
            
            <View className="mb-4 bg-gray-50 p-3 rounded-lg">
              <Text className="text-gray-700 font-medium mb-2">Ride Details</Text>
              
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Distance:</Text>
                <Text className="font-medium">{rideDetails.distance.toFixed(1)} km</Text>
              </View>
              
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Estimated Time:</Text>
                <Text className="font-medium">{rideDetails.duration} min</Text>
              </View>
              
              <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-200">
                <Text className="text-gray-700 font-medium">Total Fare:</Text>
                <Text className="text-blue-600 font-bold">${paymentAmount.toFixed(2)}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={initializePayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Pay with Stripe</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }
  
  // Render success modal
  const renderSuccessModal = () => {
    return (
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-md p-6 items-center">
            <View className="bg-green-100 p-4 rounded-full mb-4">
              <AntDesign name="checkcircle" size={48} color="#10b981" />
            </View>
            
            <Text className="text-2xl font-bold mb-2">Payment Successful!</Text>
            <Text className="text-gray-600 text-center mb-6">
              Your ride has been confirmed. The driver will arrive shortly.
            </Text>
            
            {currentRide && (
              <View className="bg-gray-50 w-full p-4 rounded-lg mb-6">
                <Text className="font-bold text-center mb-2">Ride Details</Text>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600">Ride ID:</Text>
                  <Text className="font-medium">#{currentRide.id}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600">Driver:</Text>
                  <Text className="font-medium">{selectedDriver?.username}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Amount Paid:</Text>
                  <Text className="font-medium">${paymentAmount.toFixed(2)}</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity
              className="bg-blue-500 py-3 px-6 rounded-lg w-full items-center"
              onPress={handleRideComplete}
            >
              <Text className="text-white font-bold">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
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
      {/* Map Container - Full screen */}
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
          showsUserLocation={true}
          followsUserLocation={false}
          showsMyLocationButton={false} // We'll add our own button
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

          {/* Driver markers */}
          {nearbyDrivers.map((driver) => {
  // Ensure we have valid coordinates
        const latitude = Number.parseFloat(driver.latitude);
  const longitude = Number.parseFloat(driver.longitude);
  
  // Skip invalid coordinates
  if (isNaN(latitude) || isNaN(longitude)) {
    console.warn("Invalid driver coordinates:", driver);
    return null;
  }
  
  return (
    <Marker
      key={driver.id || driver.driver_id || `driver-${Math.random()}`}
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
            <Text className="text-white text-center font-medium">Book Now</Text>
          </TouchableOpacity>
        </View>
      </Callout>
    </Marker>
  );
})}
        </MapView>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Waiting for location data...</Text>
        </View>
      )}

      {/* UI Elements - Using pointerEvents="box-none" to allow map interaction */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
        <SafeAreaView style={{ flex: 1, pointerEvents: 'box-none' }}>
          {/* Header - Now floating on top of map */}
          <View className="flex-row justify-between items-center p-4 mx-4 mt-2 bg-white rounded-lg shadow-md">
            <View>
              <Text className="text-gray-500 font-bold text-xl">Welcome, {user ? user.username : "User"}</Text>
            </View>
            <TouchableOpacity className="p-2" onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          {/* Search Bar - Now floating on top of map */}
          <View className="px-4 py-2 mx-4 mt-2" style={{ pointerEvents: 'auto' }}>
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
                onSubmitEditing={() => searchNearbyDrivers()}
                returnKeyType="search"
              />
              {searchingPlaces || searchingDrivers ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <TouchableOpacity onPress={() => searchNearbyDrivers()}>
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
                    className={`p-3 ${index !== searchResults.length - 1 ? 'border-b border-gray-200' : ''}`}
                    onPress={() => handlePlaceSelect(result)}
                  >
                    <Text className="font-medium">{result.structured_formatting?.main_text || result.description}</Text>
                    <Text className="text-gray-500 text-sm">{result.structured_formatting?.secondary_text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Custom My Location Button */}
          <View style={{ position: 'absolute', right: 16, top: 120, pointerEvents: 'auto' }}>
            <TouchableOpacity 
              onPress={centerOnUserLocation}
              className="bg-white p-3 rounded-full shadow-md"
            >
              <Ionicons name="locate" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          {/* Spacer to push bottom elements to the bottom */}
          <View style={{ flex: 1, pointerEvents: 'none' }} />

          {/* Bottom Sheet Component - Pass the searchNearbyDrivers function */}
          <View style={{ pointerEvents: 'auto' }}>
            <BottomSheetComponent 
              onSearchDrivers={() => {
                console.log("Search drivers button pressed");
                searchNearbyDrivers();
              }} 
              searchingDrivers={searchingDrivers}
              onFindAllDrivers={() => {
                console.log("Find all drivers button pressed");
                fetchAllAvailableDrivers();
              }}
            />
          </View>
        </SafeAreaView>

        {/* Bottom navigation with labels - Now outside of SafeAreaView */}
        <SafeAreaView style={{ backgroundColor: 'transparent', pointerEvents: 'box-none' }}>
          <View className="flex-row justify-between items-center bg-white p-4 mx-4 mb-4 rounded-lg shadow-md" style={{ pointerEvents: 'auto' }}>
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
      </View>
      
      {/* Payment Modal */}
      {renderPaymentModal()}
      
      {/* Success Modal */}
      {renderSuccessModal()}
    </View>
  )
}