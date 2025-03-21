import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-800">Home</Text>
            <View className="flex-row">
              <Ionicons name="notifications-outline" size={24} color="#333" className="mr-4" />
              <Ionicons name="settings-outline" size={24} color="#333" />
            </View>
          </View>
          
          <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Welcome to Ride App</Text>
            <Text className="text-gray-600 mb-3">
              Book a ride to your destination with just a few taps.
            </Text>
            <View className="h-32 bg-gray-200 rounded-lg justify-center items-center">
              <Ionicons name="map-outline" size={48} color="#666" />
            </View>
          </View>
          
          <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Promotions</Text>
            <View className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <Text className="text-blue-800 font-medium">Get 10% off your next ride!</Text>
              <Text className="text-blue-600 text-sm mt-1">Use code: WELCOME10</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}