import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert, Switch, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, FontAwesome, Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const BASE_URL = 'http://192.168.137.183:8080';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRides: 0,
    activeDrivers: 0,
    totalUsers: 0,
    revenue: 0
  });
  const [recentRides, setRecentRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, {
        withCredentials: true
      });
      
      // Fetch recent rides
      const ridesResponse = await axios.get(`${BASE_URL}/api/admin/recent-rides`, {
        withCredentials: true
      });
      
      // Fetch drivers
      const driversResponse = await axios.get(`${BASE_URL}/api/auth/drivers`, {
        withCredentials: true
      });
      
      // Fetch users
      const usersResponse = await axios.get(`${BASE_URL}/api/auth/users`, {
        withCredentials: true
      });
      
      // Update state with fetched data
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
      
      if (ridesResponse.data.success) {
        setRecentRides(ridesResponse.data.rides);
      }
      
      if (driversResponse.data.success) {
        setDrivers(driversResponse.data.drivers);
      }
      
      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const updateDriverStatus = async (driverId, isVerified) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/auth/drivers/verify`, {
        driverId,
        isVerified
      }, { withCredentials: true });
      
      if (response.data.success) {
        Alert.alert('Success', 'Driver verification status updated');
        fetchDashboardData(); // Refresh data
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update driver status');
      }
    } catch (error) {
      console.error('Update driver status error:', error);
      Alert.alert('Error', 'Failed to update driver status');
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/auth/users/status`, {
        userId,
        status
      }, { withCredentials: true });
      
      if (response.data.success) {
        Alert.alert('Success', 'User status updated');
        fetchDashboardData(); // Refresh data
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Update user status error:', error);
      Alert.alert('Error', 'Failed to update user status');
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
        <TouchableOpacity onPress={() => setActiveTab('rides')}>
          <Text className="text-blue-500">View All</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-lg shadow-sm">
        {recentRides.length > 0 ? (
          recentRides.map((ride) => (
            <TouchableOpacity key={ride.id} className="p-4 border-b border-gray-100">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold">{ride.rider_name} → {ride.driver_name}</Text>
                  <Text className="text-gray-500 text-sm mt-1">{new Date(ride.created_at).toLocaleString()}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold">${parseFloat(ride.fare).toFixed(2)}</Text>
                  <View className={`px-2 py-1 rounded-full mt-1 ${
                    ride.status === 'completed' ? 'bg-green-100' : 
                    ride.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs ${
                      ride.status === 'completed' ? 'text-green-800' : 
                      ride.status === 'cancelled' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {ride.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="p-4 items-center">
            <Text className="text-gray-500">No recent rides</Text>
          </View>
        )}
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
          "Total Users",
          stats.totalUsers,
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
          <TouchableOpacity 
            className="w-1/3 items-center mb-4"
            onPress={() => setActiveTab('drivers')}
          >
            <View className="bg-blue-100 w-14 h-14 rounded-full items-center justify-center">
              <MaterialIcons name="person-add" size={24} color="#3B82F6" />
            </View>
            <Text className="text-sm mt-2 text-center">Manage Drivers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-1/3 items-center mb-4"
            onPress={() => setActiveTab('users')}
          >
            <View className="bg-green-100 w-14 h-14 rounded-full items-center justify-center">
              <Feather name="users" size={24} color="#10B981" />
            </View>
            <Text className="text-sm mt-2 text-center">Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-1/3 items-center mb-4"
            onPress={() => setActiveTab('rides')}
          >
            <View className="bg-yellow-100 w-14 h-14 rounded-full items-center justify-center">
              <Ionicons name="document-text" size={24} color="#F59E0B" />
            </View>
            <Text className="text-sm mt-2 text-center">View Rides</Text>
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
    <View className="absolute right-4 top-16 bg-white shadow-lg rounded-lg p-2 z-50 w-48">
      <View className="p-3 border-b border-gray-100">
        <Text className="font-semibold text-black">{profile?.username || 'Admin'}</Text>
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
        <Text className="ml-2 text-black">My Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className="flex-row items-center p-3"
        onPress={() => {
          setShowProfileMenu(false);
          navigation.navigate('Settings');
        }}
      >
        <Feather name="settings" size={18} color="#6B7280" />
        <Text className="ml-2 text-black">Settings</Text>
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

  const renderDriverModal = () => {
    if (!selectedDriver) return null;
    
    return (
      <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4">
        <View className="bg-white rounded-lg w-full max-w-md p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Driver Details</Text>
            <TouchableOpacity onPress={() => {
              setSelectedDriver(null);
              setShowDriverModal(false);
            }}>
              <AntDesign name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">Driver Name</Text>
            <Text className="text-lg font-semibold">{selectedDriver.username}</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">Email</Text>
            <Text className="text-lg">{selectedDriver.email}</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">Phone</Text>
            <Text className="text-lg">{selectedDriver.phone_number || 'N/A'}</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">License</Text>
            <Text className="text-lg">{selectedDriver.driver_license}</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">Vehicle</Text>
            <Text className="text-lg">{selectedDriver.vehicle_model} ({selectedDriver.vehicle_color})</Text>
            <Text className="text-lg">{selectedDriver.vehicle_plate}</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-500">Experience</Text>
            <Text className="text-lg">{selectedDriver.years_of_experience || 'N/A'} years</Text>
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <Text className="text-gray-500">License Verified</Text>
            <Switch
              value={selectedDriver.license_verified === 1}
              onValueChange={(value) => {
                updateDriverStatus(selectedDriver.id, value ? 1 : 0);
                setSelectedDriver({
                  ...selectedDriver,
                  license_verified: value ? 1 : 0
                });
              }}
            />
          </View>
          
          <View className="mb-4 flex-row justify-between items-center">
            <Text className="text-gray-500">Active</Text>
            <Switch
              value={selectedDriver.is_active === 1}
              onValueChange={(value) => {
                updateUserStatus(selectedDriver.user_id, value ? 1 : 0);
                setSelectedDriver({
                  ...selectedDriver,
                  is_active: value ? 1 : 0
                });
              }}
            />
          </View>
          
          <TouchableOpacity 
            className="bg-blue-500 py-3 rounded-lg items-center mt-2"
            onPress={() => {
              setSelectedDriver(null);
              setShowDriverModal(false);
            }}
          >
            <Text className="text-white font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDrivers = () => {
    const filteredDrivers = drivers.filter(driver => 
      driver.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <View className="flex-1 p-4">
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            className="ml-2 bg-blue-500 p-2 rounded-lg"
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map(driver => (
              <TouchableOpacity 
                key={driver.id}
                className="bg-white rounded-lg shadow-sm mb-3 p-4"
                onPress={() => {
                  setSelectedDriver(driver);
                  setShowDriverModal(true);
                }}
              >
                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">{driver.username}</Text>
                    <Text className="text-gray-500">{driver.email}</Text>
                    <Text className="text-gray-500 mt-1">
                      {driver.vehicle_model} • {driver.vehicle_color} • {driver.vehicle_plate}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View className={`px-2 py-1 rounded-full ${
                      driver.license_verified === 1 ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <Text className={`text-xs ${
                        driver.license_verified === 1 ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {driver.license_verified === 1 ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full mt-1 ${
                      driver.is_active === 1 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Text className={`text-xs ${
                        driver.is_active === 1 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {driver.is_active === 1 ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No drivers found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderUsers = () => {
    const filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <View className="flex-1 p-4">
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            className="ml-2 bg-blue-500 p-2 rounded-lg"
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <View key={user.id} className="bg-white rounded-lg shadow-sm mb-3 p-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">{user.username}</Text>
                    <Text className="text-gray-500">{user.email}</Text>
                    <Text className="text-gray-500 mt-1">
                      {user.phone_number || 'No phone'} • {user.role}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Switch
                      value={user.is_active === 1}
                      onValueChange={(value) => updateUserStatus(user.id, value ? 1 : 0)}
                    />
                    <Text className="text-xs text-gray-500 mt-1">
                      {user.is_active === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No users found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderRides = () => {
    return (
      <View className="flex-1 p-4">
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {recentRides.length > 0 ? (
            recentRides.map((ride) => (
              <View key={ride.id} className="bg-white rounded-lg shadow-sm mb-3 p-4">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-bold text-lg">Ride #{ride.id}</Text>
                    <Text className="text-gray-700 mt-1">
                      <Text className="font-semibold">From:</Text> {ride.rider_name}
                    </Text>
                    <Text className="text-gray-700">
                      <Text className="font-semibold">To:</Text> {ride.driver_name}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {new Date(ride.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-lg">${parseFloat(ride.fare).toFixed(2)}</Text>
                    <View className={`px-3 py-1 rounded-full mt-1 ${
                      ride.status === 'completed' ? 'bg-green-100' : 
                      ride.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        ride.status === 'completed' ? 'text-green-800' : 
                        ride.status === 'cancelled' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {ride.status.toUpperCase()}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full mt-1 ${
                      ride.payment_status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        ride.payment_status === 'paid' ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {ride.payment_status ? ride.payment_status.toUpperCase() : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <View className="flex-row">
                    <View className="w-1/2">
                      <Text className="text-gray-500 text-xs">PICKUP</Text>
                      <Text className="text-gray-700">
                        {ride.pickup_address || `${parseFloat(ride.pickup_latitude).toFixed(4)}, ${parseFloat(ride.pickup_longitude).toFixed(4)}`}
                      </Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-gray-500 text-xs">DROPOFF</Text>
                      <Text className="text-gray-700">
                        {ride.dropoff_address || `${parseFloat(ride.dropoff_latitude).toFixed(4)}, ${parseFloat(ride.dropoff_longitude).toFixed(4)}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No rides found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'drivers':
        return renderDrivers();
      case 'users':
        return renderUsers();
      case 'rides':
        return renderRides();
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
      <View className="bg-white shadow-sm px-4 pt-12 pb-4">
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
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Main Content */}
      <View className="flex-1">
        {renderContent()}
      </View>
      
      {/* Profile Menu */}
      {showProfileMenu && renderProfileMenu()}
      
      {/* Driver Modal */}
      {showDriverModal && renderDriverModal()}
      
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
          <Text className={`text-xs mt-1 ${activeTab === 'dashboard' ? 'text-black' : 'text-gray-500'}`} />

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
        <TouchableOpacity 
          className="items-center"
          onPress={() => setActiveTab('rides')}
        >
          <Ionicons 
            name="car" 
            size={24} 
            color={activeTab === 'rides' ? '#3B82F6' : '#6B7280'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'rides' ? 'text-blue-500' : 'text-gray-500'}`}>
            Rides
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}