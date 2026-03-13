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

interface Asset {
  id: number;
  name: string;
  description: string;
  asset_type: { name: string };
  location: { name: string };
  status: string;
  serial_number: string;
  qr_code: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  manufacturer: string;
  model: string;
  purchase_date: string;
  warranty_expiry: string;
}

const AssetsScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [newAsset, setNewAsset] = useState({
    name: '',
    description: '',
    asset_type: '',
    location: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    purchase_date: '',
    warranty_expiry: '',
    expected_lifespan_years: '',
    location_detail: '',
  });
  const [assetTypes, setAssetTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchAssets();
    fetchAssetTypes();
    fetchLocations();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await client.get(`${API_BASE}/assets/`);
      setAssets(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      Alert.alert('Error', 'Failed to load assets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const response = await client.get(`${API_BASE}/asset-types/`);
      setAssetTypes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await client.get('/locations/');
      setLocations(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssets();
  };

  const createAsset = async () => {
    if (!newAsset.name || !newAsset.asset_type || !newAsset.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await client.post(`${API_BASE}/assets/`, newAsset);
      setShowCreateModal(false);
      setNewAsset({
        name: '',
        description: '',
        asset_type: '',
        location: '',
        serial_number: '',
        manufacturer: '',
        model: '',
        purchase_date: '',
        warranty_expiry: '',
        expected_lifespan_years: '',
        location_detail: '',
      });
      fetchAssets();
      Alert.alert('Success', 'Asset created successfully');
    } catch (error) {
      console.error('Error creating asset:', error);
      Alert.alert('Error', 'Failed to create asset');
    }
  };

  const generateQRCode = async (assetId: number) => {
    try {
      const response = await client.get(`${API_BASE}/assets/${assetId}/qr_code/`);
      setQrCodeData(response.data.qr_code);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const checkoutAsset = async (assetId: number) => {
    Alert.prompt(
      'Check Out Asset',
      'Enter expected return date (YYYY-MM-DD):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async (date: string | undefined) => {
            if (!date) return;
            try {
              await client.post(`${API_BASE}/assets/${assetId}/checkout/`, {
                expected_return_at: date,
                notes: 'Checked out via mobile app',
                condition: 'Good condition',
              });
              fetchAssets();
              Alert.alert('Success', 'Asset checked out successfully');
            } catch (error) {
              console.error('Error checking out asset:', error);
              Alert.alert('Error', 'Failed to check out asset');
            }
          },
        },
      ],
      'plain-text',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return '#4caf50';
      case 'UNDER_MAINTENANCE': return '#ff8800';
      case 'OUT_OF_SERVICE': return '#ff4444';
      case 'RETIRED': return '#9e9e9e';
      default: return '#666';
    }
  };

  const getMaintenanceStatus = (asset: Asset) => {
    if (!asset.next_maintenance_date) return null;
    
    const nextMaintenance = new Date(asset.next_maintenance_date);
    const today = new Date();
    const daysUntil = Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'Overdue', color: '#ff4444' };
    if (daysUntil <= 7) return { status: 'Due Soon', color: '#ff8800' };
    if (daysUntil <= 30) return { status: 'Scheduled', color: '#2196f3' };
    return null;
  };

  const renderAsset = ({ item }: { item: Asset }) => {
    const maintenanceStatus = getMaintenanceStatus(item);
    
    return (
      <TouchableOpacity
        style={styles.assetCard}
        onPress={() => {
          setSelectedAsset(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.assetHeader}>
          <Text style={styles.assetName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        
        <Text style={styles.assetDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.assetMeta}>
          <Text style={styles.assetType}>{item.asset_type?.name}</Text>
          <Text style={styles.locationText}>{item.location?.name}</Text>
        </View>
        
        {item.serial_number && (
          <Text style={styles.serialNumber}>SN: {item.serial_number}</Text>
        )}

        {maintenanceStatus && (
          <View style={[styles.maintenanceBadge, { backgroundColor: maintenanceStatus.color }]}>
            <Text style={styles.maintenanceText}>{maintenanceStatus.status}</Text>
          </View>
        )}

        <View style={styles.assetActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => generateQRCode(item.id)}
          >
            <Ionicons name="qr-code" size={20} color="#2196f3" />
            <Text style={styles.actionButtonText}>QR</Text>
          </TouchableOpacity>
          
          {item.status === 'OPERATIONAL' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => checkoutAsset(item.id)}
            >
              <Ionicons name="log-out" size={20} color="#4caf50" />
              <Text style={styles.actionButtonText}>Check Out</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedAsset(item);
              setShowDetailModal(true);
            }}
          >
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.modalTitle}>New Asset</Text>
          <TouchableOpacity onPress={createAsset}>
            <Text style={styles.saveButton}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={newAsset.name}
              onChangeText={(text) => setNewAsset({ ...newAsset, name: text })}
              placeholder="Asset name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newAsset.description}
              onChangeText={(text) => setNewAsset({ ...newAsset, description: text })}
              placeholder="Asset description"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Asset Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.assetTypeOptions}>
                {assetTypes.map((type: any) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.assetTypeOption,
                      newAsset.asset_type == type.id && styles.selectedAssetType
                    ]}
                    onPress={() => setNewAsset({ ...newAsset, asset_type: type.id.toString() })}
                  >
                    <Text style={styles.assetTypeOptionText}>{type.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.locationOptions}>
                {locations.map((location: any) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.locationOption,
                      newAsset.location == location.id && styles.selectedLocation
                    ]}
                    onPress={() => setNewAsset({ ...newAsset, location: location.id.toString() })}
                  >
                    <Text style={styles.locationOptionText}>{location.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Serial Number</Text>
            <TextInput
              style={styles.input}
              value={newAsset.serial_number}
              onChangeText={(text) => setNewAsset({ ...newAsset, serial_number: text })}
              placeholder="Serial number"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Manufacturer</Text>
            <TextInput
              style={styles.input}
              value={newAsset.manufacturer}
              onChangeText={(text) => setNewAsset({ ...newAsset, manufacturer: text })}
              placeholder="Manufacturer"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={newAsset.model}
              onChangeText={(text) => setNewAsset({ ...newAsset, model: text })}
              placeholder="Model"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Purchase Date</Text>
            <TextInput
              style={styles.input}
              value={newAsset.purchase_date}
              onChangeText={(text) => setNewAsset({ ...newAsset, purchase_date: text })}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Warranty Expiry</Text>
            <TextInput
              style={styles.input}
              value={newAsset.warranty_expiry}
              onChangeText={(text) => setNewAsset({ ...newAsset, warranty_expiry: text })}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Expected Lifespan (years)</Text>
            <TextInput
              style={styles.input}
              value={newAsset.expected_lifespan_years}
              onChangeText={(text) => setNewAsset({ ...newAsset, expected_lifespan_years: text })}
              placeholder="Expected lifespan in years"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location Detail</Text>
            <TextInput
              style={styles.input}
              value={newAsset.location_detail}
              onChangeText={(text) => setNewAsset({ ...newAsset, location_detail: text })}
              placeholder="Specific location within building"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowDetailModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Asset Details</Text>
          <TouchableOpacity onPress={() => selectedAsset && generateQRCode(selectedAsset.id)}>
            <Ionicons name="qr-code" size={24} color="#2196f3" />
          </TouchableOpacity>
        </View>

        {selectedAsset && (
          <ScrollView style={styles.modalContent}>
            <Text style={styles.detailTitle}>{selectedAsset.name}</Text>
            <Text style={styles.detailDescription}>{selectedAsset.description}</Text>
            
            <View style={styles.detailMeta}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAsset.status) }]}>
                <Text style={styles.statusText}>{selectedAsset.status.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Type: {selectedAsset.asset_type?.name}</Text>
              <Text style={styles.detailLabel}>Location: {selectedAsset.location?.name}</Text>
              {selectedAsset.serial_number && (
                <Text style={styles.detailLabel}>Serial: {selectedAsset.serial_number}</Text>
              )}
              {selectedAsset.manufacturer && (
                <Text style={styles.detailLabel}>Manufacturer: {selectedAsset.manufacturer}</Text>
              )}
              {selectedAsset.model && (
                <Text style={styles.detailLabel}>Model: {selectedAsset.model}</Text>
              )}
              {selectedAsset.purchase_date && (
                <Text style={styles.detailLabel}>
                  Purchase Date: {new Date(selectedAsset.purchase_date).toLocaleDateString()}
                </Text>
              )}
              {selectedAsset.warranty_expiry && (
                <Text style={styles.detailLabel}>
                  Warranty Expires: {new Date(selectedAsset.warranty_expiry).toLocaleDateString()}
                </Text>
              )}
              {selectedAsset.last_maintenance_date && (
                <Text style={styles.detailLabel}>
                  Last Maintenance: {new Date(selectedAsset.last_maintenance_date).toLocaleDateString()}
                </Text>
              )}
              {selectedAsset.next_maintenance_date && (
                <Text style={styles.detailLabel}>
                  Next Maintenance: {new Date(selectedAsset.next_maintenance_date).toLocaleDateString()}
                </Text>
              )}
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.detailActionButton, styles.qrButton]}
                onPress={() => generateQRCode(selectedAsset.id)}
              >
                <Ionicons name="qr-code" size={20} color="white" />
                <Text style={styles.detailActionButtonText}>Generate QR Code</Text>
              </TouchableOpacity>
              
              {selectedAsset.status === 'OPERATIONAL' && (
                <TouchableOpacity
                  style={[styles.detailActionButton, styles.checkoutButton]}
                  onPress={() => checkoutAsset(selectedAsset.id)}
                >
                  <Ionicons name="log-out" size={20} color="white" />
                  <Text style={styles.detailActionButtonText}>Check Out Asset</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderQRModal = () => (
    <Modal
      visible={showQRModal}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.qrOverlay}>
        <View style={styles.qrContainer}>
          <TouchableOpacity
            style={styles.qrClose}
            onPress={() => setShowQRModal(false)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {qrCodeData ? (
            <Image
              source={{ uri: `data:image/png;base64,${qrCodeData}` }}
              style={styles.qrImage}
            />
          ) : (
            <Text style={styles.qrLoadingText}>Generating QR Code...</Text>
          )}
          
          {selectedAsset && (
            <Text style={styles.qrAssetName}>{selectedAsset.name}</Text>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assets</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={assets}
        renderItem={renderAsset}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {renderCreateModal()}
      {renderDetailModal()}
      {renderQRModal()}
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
  assetCard: {
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
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  assetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  assetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  assetMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assetType: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  serialNumber: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  maintenanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  maintenanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    height: 80,
    textAlignVertical: 'top',
  },
  assetTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  assetTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedAssetType: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  assetTypeOptionText: {
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
  detailActions: {
    gap: 12,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  qrButton: {
    backgroundColor: '#2196f3',
  },
  checkoutButton: {
    backgroundColor: '#4caf50',
  },
  detailActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  qrClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 16,
  },
  qrLoadingText: {
    fontSize: 16,
    color: '#666',
    margin: 50,
  },
  qrAssetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default AssetsScreen;
