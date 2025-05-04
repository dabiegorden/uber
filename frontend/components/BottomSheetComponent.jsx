import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values'; // Add this import to fix uuid crypto error

const BASE_URL = "http://192.168.0.100:8080";
const GOOGLE_PLACES_API_KEY = "AIzaSyAqmJNttn7mi2WP30NgfpA60OjrfVGKlSE";

const BottomSheetComponent = ({ onSearchDrivers, searchingDrivers, onFindAllDrivers }) => {
  const bottomSheetRef = useRef(null);
  const [destination, setDestination] = useState(null);
  const [fare, setFare] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const calculateFare = async (destinationLocation) => {
    if (!destinationLocation) return;

    setCalculating(true);
    try {
      // Get current location
      const locationResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const locationData = await locationResponse.json();
      
      if (!locationData.success || !locationData.user.latitude || !locationData.user.longitude) {
        console.error('Could not get current location');
        return;
      }
      
      const currentLocation = {
        latitude: locationData.user.latitude,
        longitude: locationData.user.longitude
      };

      // Calculate fare
      const response = await fetch(`${BASE_URL}/api/rides/calculate-fare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupLocation: currentLocation,
          dropoffLocation: destinationLocation
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setFare(data);
      }
    } catch (error) {
      console.error('Error calculating fare:', error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={['15%', '50%', '75%']}
        handleIndicatorStyle={{ backgroundColor: '#CCCCCC', width: 50 }}
        backgroundStyle={{ backgroundColor: 'white' }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Where to?</Text>
          
          <GooglePlacesAutocomplete
            placeholder='Enter destination'
            onPress={(data, details = null) => {
              if (details) {
                const destinationLocation = {
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng
                };
                setDestination({
                  name: data.description,
                  location: destinationLocation
                });
                calculateFare(destinationLocation);
              }
            }}
            fetchDetails={true}
            query={{
              key: GOOGLE_PLACES_API_KEY,
              language: 'en',
            }}
            styles={{
              container: {
                flex: 0,
                marginBottom: 15
              },
              textInputContainer: {
                backgroundColor: '#F2F2F2',
                borderRadius: 8,
                paddingHorizontal: 5
              },
              textInput: {
                height: 45,
                color: '#000',
                fontSize: 16,
                backgroundColor: '#F2F2F2'
              },
              predefinedPlacesDescription: {
                color: '#1faadb'
              },
            }}
          />

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

          <TouchableOpacity 
            style={styles.searchButton}
            onPress={onSearchDrivers}
            disabled={searchingDrivers}
          >
            {searchingDrivers ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="white" />
                <Text style={styles.searchButtonText}>Find Nearby Drivers</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.allDriversButton}
            onPress={onFindAllDrivers}
            disabled={searchingDrivers}
          >
            {searchingDrivers ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <MaterialIcons name="people" size={20} color="#3B82F6" />
                <Text style={styles.allDriversButtonText}>Show All Available Drivers</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  allDriversButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  allDriversButtonText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  fareContainer: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  fareLabel: {
    color: '#4B5563',
  },
  fareValue: {
    color: '#1F2937',
    fontWeight: '500',
  },
  fareLabelTotal: {
    color: '#1F2937',
    fontWeight: 'bold',
  },
  fareValueTotal: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});

export default BottomSheetComponent;