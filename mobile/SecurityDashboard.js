import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Card, Button, Badge, ProgressBar, Colors } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PushNotification from 'react-native-push-notification';

const { width } = Dimensions.get('window');

const SecurityDashboard = ({ token, tenantId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threatLevel, setThreatLevel] = useState('LOW');

  // Configure push notifications
  useEffect(() => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
        registerDeviceToken(token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        if (notification.userInteraction) {
          // User tapped notification
          handleNotificationPress(notification);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    fetchDashboardData();
    fetchNotifications();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNotifications();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const registerDeviceToken = async (fcmToken) => {
    try {
      const response = await fetch('http://localhost:8001/api/notifications/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: fcmToken,
          device_name: 'Mobile App',
          token_type: 'fcm',
        }),
      });
      
      if (response.ok) {
        console.log('Device token registered successfully');
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        `http://localhost:8001/api/security/dashboard/?time_range=24h`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setThreatLevel(data.threat_indicators.overall_threat_level);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        'http://localhost:8001/api/notifications/history/?page=1&page_size=5',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchNotifications(),
    ]);
    setRefreshing(false);
  };

  const handleNotificationPress = (notification) => {
    // Handle notification tap - navigate to relevant screen
    Alert.alert(
      notification.title || 'Security Alert',
      notification.message || 'You have a new security notification'
    );
  };

  const openGate = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/security/gate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'open',
          reason: 'Manual open from mobile app',
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Gate opened successfully');
      } else {
        Alert.alert('Error', 'Failed to open gate');
      }
    } catch (error) {
      console.error('Error opening gate:', error);
      Alert.alert('Error', 'Failed to open gate');
    }
  };

  const getThreatColor = (level) => {
    switch (level) {
      case 'LOW': return Colors.green500;
      case 'MEDIUM': return Colors.orange500;
      case 'HIGH': return Colors.red500;
      case 'CRITICAL': return Colors.purple500;
      default: return Colors.grey500;
    }
  };

  const getThreatIcon = (level) => {
    switch (level) {
      case 'LOW': return 'shield-check';
      case 'MEDIUM': return 'shield-alert';
      case 'HIGH': return 'shield-alert';
      case 'CRITICAL': return 'shield-remove';
      default: return 'shield';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading security dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Threat Level Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.threatHeader}>
            <Icon 
              name={getThreatIcon(threatLevel)} 
              size={32} 
              color={getThreatColor(threatLevel)} 
            />
            <View style={styles.threatInfo}>
              <Text style={styles.threatTitle}>Threat Level</Text>
              <Text style={[styles.threatLevel, { color: getThreatColor(threatLevel) }]}>
                {threatLevel}
              </Text>
              <Text style={styles.threatScore}>
                Score: {dashboardData?.threat_indicators?.threat_score || 0}/100
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={(dashboardData?.threat_indicators?.threat_score || 0) / 100}
            color={getThreatColor(threatLevel)}
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { flex: 1 }]}>
          <Card.Content>
            <Icon name="door-sliding" size={24} color={Colors.blue500} />
            <Text style={styles.statNumber}>
              {dashboardData?.summary?.total_access_attempts || 0}
            </Text>
            <Text style={styles.statLabel}>Access Attempts</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { flex: 1 }]}>
          <Card.Content>
            <Icon name="alert" size={24} color={Colors.orange500} />
            <Text style={styles.statNumber}>
              {dashboardData?.incidents?.open_count || 0}
            </Text>
            <Text style={styles.statLabel}>Open Incidents</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { flex: 1 }]}>
          <Card.Content>
            <Icon name="bell" size={24} color={Colors.red500} />
            <Text style={styles.statNumber}>
              {dashboardData?.alerts?.active || 0}
            </Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Gate Control */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Gate Control</Text>
          <Button
            mode="contained"
            onPress={openGate}
            style={styles.gateButton}
            icon="door-open"
          >
            Open Gate
          </Button>
        </Card.Content>
      </Card>

      {/* Recent Notifications */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Alerts</Text>
            <Badge size={25}>{notifications.length}</Badge>
          </View>
          {notifications.map((notification, index) => (
            <TouchableOpacity
              key={index}
              style={styles.notificationItem}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {new Date(notification.created_at).toLocaleTimeString()}
                </Text>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={Colors.grey500}
              />
            </TouchableOpacity>
          ))}
          {notifications.length === 0 && (
            <Text style={styles.noNotifications}>No recent notifications</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  threatInfo: {
    marginLeft: 15,
    flex: 1,
  },
  threatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  threatLevel: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  threatScore: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 10,
  },
  statCard: {
    marginHorizontal: 5,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  gateButton: {
    marginTop: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noNotifications: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});

export default SecurityDashboard;
