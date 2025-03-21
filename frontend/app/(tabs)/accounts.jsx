import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-800 mb-6">Account</Text>
          
          <View className="bg-white rounded-xl shadow-sm mb-4">
            <View className="p-4 flex-row items-center">
              <View className="w-16 h-16 bg-gray-200 rounded-full justify-center items-center mr-4">
                <Ionicons name="person" size={32} color="#777" />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-800">User Name</Text>
                <Text className="text-gray-500">user@example.com</Text>
                <TouchableOpacity className="mt-1">
                  <Text className="text-blue-600">Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View className="bg-white rounded-xl shadow-sm mb-4">
            <TouchableOpacity className="p-4 border-b border-gray-100 flex-row items-center">
              <Ionicons name="card-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity className="p-4 border-b border-gray-100 flex-row items-center">
              <Ionicons name="time-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Ride History</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity className="p-4 border-b border-gray-100 flex-row items-center">
              <Ionicons name="gift-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Promotions</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity className="p-4 flex-row items-center">
              <Ionicons name="help-circle-outline" size={24} color="#333" className="mr-3" />
              <Text className="flex-1 text-gray-800 text-base">Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity className="bg-white p-4 rounded-xl shadow-sm mb-4 flex-row items-center">
            <Ionicons name="exit-outline" size={24} color="#e74c3c" className="mr-3" />
            <Text className="text-red-500 text-base font-medium">Sign Out</Text>
          </TouchableOpacity>
          
          <Text className="text-center text-gray-400 text-sm mt-4">App Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}