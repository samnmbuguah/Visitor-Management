import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../src/api/client';

const API_BASE = '/property-management';

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  location: { name: string };
  category: { name: string };
  requested_at: string;
  photos: Array<{ photo: string; caption: string }>;
}

const MaintenanceScreen = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
    location: '',
  });
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchRequests();
    fetchCategories();
    fetchLocations();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await client.get(`${API_BASE}/requests/`);
      setRequests(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      Alert.alert('Error', 'Failed to load maintenance requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await client.get(`${API_BASE}/categories/`);
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await client.get('/visitors/locations/');
      setLocations(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const createRequest = async () => {
    if (!newRequest.title || !newRequest.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await client.post(`${API_BASE}/requests/`, newRequest);
      setShowCreateModal(false);
      setNewRequest({
        title: '',
        description: '',
        priority: 'MEDIUM',
        category: '',
        location: '',
      });
      fetchRequests();
      Alert.alert('Success', 'Maintenance request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Failed to create maintenance request');
    }
  };

  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    try {
      await client.post(`${API_BASE}/requests/${requestId}/update_status/`, {
        status: newStatus,
      });
      fetchRequests();
      Alert.alert('Success', 'Request status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return '#ff4444';
      case 'HIGH': return '#ff8800';
      case 'MEDIUM': return '#ffaa00';
      case 'LOW': return '#00aa00';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return '#ff8800';
      case 'ASSIGNED': return '#2196f3';
      case 'IN_PROGRESS': return '#4caf50';
      case 'COMPLETED': return '#9e9e9e';
      default: return '#666';
    }
  };

  const renderRequest = ({ item }: { item: MaintenanceRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest(item);
        setShowPhotoModal(true);
      }}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestTitle}>{item.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      <Text style={styles.requestDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.requestMeta}>
        <Text style={styles.locationText}>{item.location?.name}</Text>
        <Text style={styles.categoryText}>{item.category?.name}</Text>
      </View>
      
      <View style={styles.requestFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.requested_at).toLocaleDateString()}
        </Text>
      </View>

      {item.photos && item.photos.length > 0 && (
        <View style={styles.photoIndicator}>
          <Ionicons name="camera" size={16} color="#666" />
          <Text style={styles.photoCount}>{item.photos.length} photos</Text>
        </View>
      )}

      {item.status === 'REQUESTED' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.assignButton]}
            onPress={() => updateRequestStatus(item.id, 'ASSIGNED')}
          >
            <Text style={styles.actionButtonText}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.progressButton]}
            onPress={() => updateRequestStatus(item.id, 'IN_PROGRESS')}
          >
            <Text style={styles.actionButtonText}>Start Work</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'IN_PROGRESS' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => updateRequestStatus(item.id, 'COMPLETED')}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Maintenance Request</Text>
          <TouchableOpacity onPress={createRequest}>
            <Text style={styles.saveButton}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={newRequest.title}
              onChangeText={(text) => setNewRequest({ ...newRequest, title: text })}
              placeholder="Brief description of the issue"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newRequest.description}
              onChangeText={(text) => setNewRequest({ ...newRequest, description: text })}
              placeholder="Detailed description of the issue"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityOptions}>
              {['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    newRequest.priority === priority && styles.selectedPriority,
                    { backgroundColor: getPriorityColor(priority) }
                  ]}
                  onPress={() => setNewRequest({ ...newRequest, priority })}
                >
                  <Text style={styles.priorityOptionText}>{priority}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryOptions}>
                {categories.map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      newRequest.category == category.id && styles.selectedCategory
                    ]}
                    onPress={() => setNewRequest({ ...newRequest, category: category.id.toString() })}
                  >
                    <Text style={styles.categoryOptionText}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.locationOptions}>
                {locations.map((location: any) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.locationOption,
                      newRequest.location == location.id && styles.selectedLocation
                    ]}
                    onPress={() => setNewRequest({ ...newRequest, location: location.id.toString() })}
                  >
                    <Text style={styles.locationOptionText}>{location.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderPhotoModal = () => (
    <Modal
      visible={showPhotoModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Maintenance Details</Text>
          <View style={{ width: 50 }} />
        </View>

        {selectedRequest && (
          <ScrollView style={styles.modalContent}>
            <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
            <Text style={styles.detailDescription}>{selectedRequest.description}</Text>
            
            <View style={styles.detailMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                <Text style={styles.priorityText}>{selectedRequest.priority}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                <Text style={styles.statusText}>{selectedRequest.status.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Location: {selectedRequest.location?.name}</Text>
              <Text style={styles.detailLabel}>Category: {selectedRequest.category?.name}</Text>
              <Text style={styles.detailLabel}>
                Requested: {new Date(selectedRequest.requested_at).toLocaleDateString()}
              </Text>
            </View>

            {selectedRequest.photos && selectedRequest.photos.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.sectionTitle}>Photos</Text>
                {selectedRequest.photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${photo.photo}` }}
                      style={styles.photo}
                    />
                    {photo.caption && <Text style={styles.photoCaption}>{photo.caption}</Text>}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Maintenance</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {renderCreateModal()}
      {renderPhotoModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196f3',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  photoCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#2196f3',
  },
  progressButton: {
    backgroundColor: '#4caf50',
  },
  completeButton: {
    backgroundColor: '#4caf50',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedPriority: {
    borderWidth: 2,
    borderColor: '#333',
  },
  priorityOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategory: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  categoryOptionText: {
    color: '#333',
    fontSize: 12,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedLocation: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  locationOptionText: {
    color: '#333',
    fontSize: 12,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  detailInfo: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  photosSection: {
    marginTop: 20,
  },
  photoItem: {
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoCaption: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default MaintenanceScreen;
