import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, FontAwesome, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const BASE_URL = 'http://192.168.137.92:8080';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRides: 0,
    activeDrivers: 0,
    newUsers: 0,
    revenue: 0
  });
  const [recentRides, setRecentRides] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Fetch admin profile and dashboard data
  useEffect(() => {
    fetchAdminProfile();
    fetchDashboardData();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
        withCredentials: true
      });
      setProfile(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    }
  };

  const fetchDashboardData = () => {
    setLoading(true);
    // Simulate API calls
    Promise.all([
      // Stats data
      new Promise(resolve => setTimeout(() => resolve({
        totalRides: 1245,
        activeDrivers: 42,
        newUsers: 38,
        revenue: 12560.75
      }), 800)),
      // Recent rides data
      new Promise(resolve => setTimeout(() => resolve([
        { id: 1, rider: 'John Doe', driver: 'Michael Smith', date: '2023-05-15', amount: 12.50, status: 'completed' },
        { id: 2, rider: 'Sarah Johnson', driver: 'Robert Brown', date: '2023-05-15', amount: 18.75, status: 'completed' },
        { id: 3, rider: 'David Wilson', driver: 'James Davis', date: '2023-05-14', amount: 15.20, status: 'completed' },
        { id: 4, rider: 'Emily Taylor', driver: 'William Miller', date: '2023-05-14', amount: 22.30, status: 'cancelled' },
        { id: 5, rider: 'Daniel Anderson', driver: 'Christopher Thomas', date: '2023-05-14', amount: 9.50, status: 'completed' },
      ]), 1200))
    ]).then(([statsData, ridesData]) => {
      setStats(statsData);
      setRecentRides(ridesData);
      setLoading(false);
      setRefreshing(false);
    }).catch(error => {
      console.error('Dashboard error:', error);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchAdminProfile();
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const renderStatCard = (icon, title, value, color) => (
    <View className="bg-white rounded-lg p-4 shadow-sm flex-1 mx-1">
      <View className={`bg-${color}-100 w-12 h-12 rounded-full items-center justify-center mb-2`}>
        {icon}
      </View>
      <Text className="text-gray-500 text-sm">{title}</Text>
      <Text className="text-xl font-bold mt-1">{value}</Text>
    </View>
  );

  const renderRecentRides = () => (
    <View className="mt-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold">Recent Rides</Text>
        <TouchableOpacity>
          <Text className="text-blue-500">View All</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-lg shadow-sm">
        {recentRides.map((ride) => (
          <TouchableOpacity key={ride.id} className="p-4 border-b border-gray-100">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="font-semibold">{ride.rider} → {ride.driver}</Text>
                <Text className="text-gray-500 text-sm mt-1">{ride.date}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold">${ride.amount.toFixed(2)}</Text>
                <View className={`px-2 py-1 rounded-full mt-1 ${
                  ride.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Text className={`text-xs ${
                    ride.status === 'completed' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {ride.status}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      className="px-4 py-6"
    >
      <Text className="text-2xl font-bold mb-6">Dashboard Overview</Text>
      
      <View className="flex-row mb-4">
        {renderStatCard(
          <MaterialIcons name="directions-car" size={24} color="#3B82F6" />,
          "Total Rides",
          stats.totalRides,
          "blue"
        )}
        {renderStatCard(
          <FontAwesome name="user" size={24} color="#10B981" />,
          "Active Drivers",
          stats.activeDrivers,
          "green"
        )}
      </View>
      
      <View className="flex-row mb-6">
        {renderStatCard(
          <Ionicons name="people" size={24} color="#F59E0B" />,
          "New Users",
          stats.newUsers,
          "yellow"
        )}
        {renderStatCard(
          <FontAwesome name="money" size={24} color="#EF4444" />,
          "Revenue",
          `$${stats.revenue.toFixed(2)}`,
          "red"
        )}
      </View>

      {renderRecentRides()}

      <View className="mt-6 mb-6 bg-white rounded-lg shadow-sm p-4">
        <Text className="text-lg font-bold mb-3">Quick Actions</Text>
        <View className="flex-row flex-wrap justify-between">
          <TouchableOpacity className="w-1/3 items-center mb-4">
            <View className="bg-blue-100 w-14 h-14 rounded-full items-center justify-center">
              <MaterialIcons name="person-add" size={24} color="#3B82F6" />
            </View>
            <Text className="text-sm mt-2 text-center">Add Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center mb-4">
            <View className="bg-green-100 w-14 h-14 rounded-full items-center justify-center">
              <Feather name="users" size={24} color="#10B981" />
            </View>
            <Text className="text-sm mt-2 text-center">Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center mb-4">
            <View className="bg-yellow-100 w-14 h-14 rounded-full items-center justify-center">
              <Ionicons name="document-text" size={24} color="#F59E0B" />
            </View>
            <Text className="text-sm mt-2 text-center">Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center">
            <View className="bg-purple-100 w-14 h-14 rounded-full items-center justify-center">
              <MaterialIcons name="settings" size={24} color="#8B5CF6" />
            </View>
            <Text className="text-sm mt-2 text-center">Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-1/3 items-center">
            <View className="bg-red-100 w-14 h-14 rounded-full items-center justify-center">
              <MaterialIcons name="support" size={24} color="#EF4444" />
            </View>
            <Text className="text-sm mt-2 text-center">Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderProfileMenu = () => (
    <View className="absolute right-4 top-16 bg-blue-500 shadow-lg rounded-lg p-2 z-10 w-48">
      <View className="p-3 border-b border-gray-100">
        <Text className="font-semibold">{profile?.username || 'Admin'}</Text>
        <Text className="text-gray-500 text-sm">{profile?.email || 'admin@example.com'}</Text>
      </View>
      <TouchableOpacity 
        className="flex-row items-center p-3"
        onPress={() => {
          setShowProfileMenu(false);
          navigation.navigate('Profile');
        }}
      >
        <Feather name="user" size={18} color="#6B7280" />
        <Text className="ml-2">My Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className="flex-row items-center p-3"
        onPress={() => {
          setShowProfileMenu(false);
          navigation.navigate('Settings');
        }}
      >
        <Feather name="settings" size={18} color="#6B7280" />
        <Text className="ml-2">Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className="flex-row items-center p-3 border-t border-gray-100"
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text className="ml-2 text-red-500">Logout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDrivers = () => (
    <View className="flex-1 items-center justify-center">
      <Text className="text-lg">Drivers Management</Text>
    </View>
  );

  const renderUsers = () => (
    <View className="flex-1 items-center justify-center">
      <Text className="text-lg">Users Management</Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'drivers':
        return renderDrivers();
      case 'users':
        return renderUsers();
      default:
        return renderDashboard();
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white shadow-sm px-4 pt-12 pb-12">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold">Admin Panel</Text>
          <View className="flex-row items-center">
            <TouchableOpacity className="ml-4">
              <Ionicons name="notifications" size={24} color="black" />
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-xs">3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              className="ml-4 relative"
              onPress={() => setShowProfileMenu(!showProfileMenu)}
            >
              <View className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                {profile?.profile_picture ? (
                  <Image
                    source={{ uri: profile.profile_picture }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="w-full h-full bg-blue-500 items-center justify-center">
                    <Text className="text-white font-bold">
                      {profile?.username?.charAt(0)?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                )}
              </View>
              {showProfileMenu && renderProfileMenu()}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Main Content */}
      <View className="flex-1">
        {renderContent()}
      </View>
      
      {/* Bottom Navigation */}
      <View className="bg-white border-t border-gray-200 flex-row justify-around py-3">
        <TouchableOpacity 
          className="items-center"
          onPress={() => setActiveTab('dashboard')}
        >
          <MaterialIcons 
            name="dashboard" 
            size={24} 
            color={activeTab === 'dashboard' ? '#3B82F6' : '#6B7280'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-gray-500'}`}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="items-center"
          onPress={() => setActiveTab('drivers')}
        >
          <MaterialIcons 
            name="directions-car" 
            size={24} 
            color={activeTab === 'drivers' ? '#3B82F6' : '#6B7280'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'drivers' ? 'text-blue-500' : 'text-gray-500'}`}>
            Drivers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="items-center"
          onPress={() => setActiveTab('users')}
        >
          <Ionicons 
            name="people" 
            size={24} 
            color={activeTab === 'users' ? '#3B82F6' : '#6B7280'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'users' ? 'text-blue-500' : 'text-gray-500'}`}>
            Users
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}