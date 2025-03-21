import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import image2 from "../../assets/images/image2.png";

export default function RidesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-800 mb-6">Rides</Text>
          
          <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Your ride options</Text>
            
            <TouchableOpacity className="flex-row items-center bg-gray-50 p-3 rounded-lg mb-3">
              <View className="w-12 h-12 rounded-lg bg-gray-200 justify-center items-center mr-3">
                <Image source={image2} className="w-10 h-6 resize-contain" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800">Economy</Text>
                <Text className="text-sm text-gray-500">Affordable rides for everyday</Text>
              </View>
              <Text className="text-gray-800 font-medium">$12-15</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center bg-gray-50 p-3 rounded-lg mb-3">
              <View className="w-12 h-12 rounded-lg bg-gray-200 justify-center items-center mr-3">
                <Ionicons name="car" size={22} color="#333" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800">Premium</Text>
                <Text className="text-sm text-gray-500">Luxury vehicles for special occasions</Text>
              </View>
              <Text className="text-gray-800 font-medium">$18-22</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center bg-gray-50 p-3 rounded-lg">
              <View className="w-12 h-12 rounded-lg bg-gray-200 justify-center items-center mr-3">
                <Ionicons name="people" size={22} color="#333" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-800">XL</Text>
                <Text className="text-sm text-gray-500">Vehicles with extra space</Text>
              </View>
              <Text className="text-gray-800 font-medium">$20-25</Text>
            </TouchableOpacity>
          </View>
          
          <View className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Recent Rides</Text>
            <View className="flex items-center justify-center p-6">
              <Ionicons name="car-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 text-base mt-2">No recent rides</Text>
              <TouchableOpacity className="mt-4 bg-black py-2 px-6 rounded-full">
                <Text className="text-white font-medium">Book a ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}