import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheetComponent from '../../components/BottomSheetComponent';

// Set the base URL for all fetch requests
const BASE_URL = 'http://192.168.137.92:8080';

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Get user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setUser(data.user);
        } else {
          // If not authenticated, redirect to login
          Alert.alert('Session Expired', 'Please login again');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Unable to fetch user profile');
      }
    };
    
    fetchUserProfile();
  }, []);

  // Get user's location
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setLocation(currentLocation);
        
        // Update location in backend
        await updateLocationInBackend(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not get your location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Set up location subscription
  useEffect(() => {
    let locationSubscription;
    
    const startLocationUpdates = async () => {
      // Request permissions again to be sure
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      // Watch position changes
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // update if moved by 10 meters
          timeInterval: 30000    // or every 30 seconds
        },
        (newLocation) => {
          setLocation(newLocation);
          updateLocationInBackend(
            newLocation.coords.latitude,
            newLocation.coords.longitude
          );
        }
      );
    };
    
    startLocationUpdates();
    
    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Function to update location in backend
  const updateLocationInBackend = async (latitude, longitude) => {
    try {
      await fetch(`${BASE_URL}/api/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to update location in backend:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      // Navigate to login
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Getting your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ position: 'relative' }}>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
          <View>
            {/* <Text className="text-xl font-bold">Trycircle</Text> */}
            <Text className="text-gray-500 font-bold text-xl">
              Welcome, {user ? user.username : 'User'}
            </Text>
          </View>
          <TouchableOpacity 
            className="p-2" 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View className="flex-1">
          {errorMsg ? (
            <View className="flex-1 justify-center items-center p-6">
              <Text className="text-red-500 text-lg font-medium mb-4">{errorMsg}</Text>
              <Text className="text-gray-600 text-center">
                This app needs location permissions to work properly. Please enable location services in your device settings.
              </Text>
            </View>
          ) : location ? (
            <MapView
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
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="You are here"
                description="Your current location"
              />
            </MapView>
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-600">Waiting for location data...</Text>
            </View>
          )}
        </View>
        
        {/* Bottom Sheet Component */}
        <BottomSheetComponent />
      </View>
    </SafeAreaView>
  );
};

export default MapScreen;