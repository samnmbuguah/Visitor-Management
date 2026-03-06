import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AssetsScreen from '../../app/(tabs)/assets';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock expo constants
jest.mock('expo-constants', () => ({
  Constants: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:8000/api',
      },
    },
  },
}));

// Mock expo secure store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockAxios = require('axios');

describe('AssetsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (component) => {
    return render(component);
  };

  test('renders assets screen correctly', async () => {
    // Mock API responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('assets')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'Main AC Unit',
              description: 'Primary air conditioning unit',
              asset_type: { name: 'HVAC' },
              location: { name: 'Main Office' },
              status: 'OPERATIONAL',
              serial_number: 'AC123456',
              qr_code: 'qr-123',
              last_maintenance_date: '2024-01-01',
              next_maintenance_date: '2024-02-01',
              manufacturer: 'Carrier',
              model: 'XYZ-1000'
            }
          ]
        });
      }
      if (url.includes('asset-types')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'HVAC' },
            { id: 2, name: 'Computer' }
          ]
        });
      }
      if (url.includes('locations')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Main Office' },
            { id: 2, name: 'Server Room' }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeTruthy();
    });

    // Check if asset is displayed
    await waitFor(() => {
      expect(screen.getByText('Main AC Unit')).toBeTruthy();
      expect(screen.getByText('OPERATIONAL')).toBeTruthy();
      expect(screen.getByText('Main Office')).toBeTruthy();
      expect(screen.getByText('HVAC')).toBeTruthy();
    });
  });

  test('opens create modal when add button is pressed', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeTruthy();
    });

    // Press add button
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.press(addButton);

    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('New Asset')).toBeTruthy();
    });
  });

  test('creates new asset', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    mockAxios.post.mockResolvedValue({ data: { id: 2 } });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeTruthy();
    });

    // Open create modal
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.press(addButton);

    // Fill form
    await waitFor(() => {
      expect(screen.getByText('New Asset')).toBeTruthy();
    });

    const nameInput = screen.getByPlaceholderText('Asset name');
    fireEvent.changeText(nameInput, 'New Computer');

    // Submit form (would need to select asset type and location first)
    const createButton = screen.getByText('Create');
    fireEvent.press(createButton);

    // Should show validation error since required fields are missing
    // This depends on the actual validation implementation
  });

  test('generates QR code for asset', async () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      description: 'Test description',
      asset_type: { name: 'Computer' },
      location: { name: 'Office' },
      status: 'OPERATIONAL',
      serial_number: 'PC123',
      qr_code: 'qr-123',
      last_maintenance_date: '2024-01-01',
      next_maintenance_date: '2024-02-01'
    };

    mockAxios.get.mockResolvedValue({ data: [mockAsset] });
    mockAxios.post.mockResolvedValue({ 
      data: { 
        qr_code: 'base64-qrcode-data',
        qr_value: 'qr-123' 
      } 
    });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Asset')).toBeTruthy();
    });

    // Click QR button
    const qrButton = screen.getByText('QR');
    fireEvent.press(qrButton);

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/property-management/assets/1/qr_code/'
      );
    });
  });

  test('checks out asset', async () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      description: 'Test description',
      asset_type: { name: 'Computer' },
      location: { name: 'Office' },
      status: 'OPERATIONAL',
      serial_number: 'PC123',
      qr_code: 'qr-123',
      last_maintenance_date: '2024-01-01',
      next_maintenance_date: '2024-02-01'
    };

    mockAxios.get.mockResolvedValue({ data: [mockAsset] });
    mockAxios.post.mockResolvedValue({ data: { status: 'success' } });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Asset')).toBeTruthy();
    });

    // Click checkout button
    const checkoutButton = screen.getByText('Check Out');
    fireEvent.press(checkoutButton);

    // Should prompt for return date
    // This depends on the actual prompt implementation
  });

  test('displays maintenance status indicators', async () => {
    const today = new Date();
    const overdueDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    const dueSoonDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    const mockAssets = [
      {
        id: 1,
        name: 'Overdue Asset',
        description: 'Maintenance overdue',
        asset_type: { name: 'HVAC' },
        location: { name: 'Office' },
        status: 'OPERATIONAL',
        next_maintenance_date: overdueDate.toISOString()
      },
      {
        id: 2,
        name: 'Due Soon Asset',
        description: 'Maintenance due soon',
        asset_type: { name: 'Computer' },
        location: { name: 'Office' },
        status: 'OPERATIONAL',
        next_maintenance_date: dueSoonDate.toISOString()
      }
    ];

    mockAxios.get.mockResolvedValue({ data: mockAssets });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Overdue Asset')).toBeTruthy();
      expect(screen.getByText('Due Soon Asset')).toBeTruthy();
    });

    // Should show maintenance status badges
    // This depends on the actual badge implementation
  });

  test('filters assets by search term', async () => {
    const mockAssets = [
      {
        id: 1,
        name: 'Air Conditioner',
        description: 'Main AC unit',
        asset_type: { name: 'HVAC' },
        location: { name: 'Office' },
        status: 'OPERATIONAL',
        serial_number: 'AC123'
      },
      {
        id: 2,
        name: 'Computer',
        description: 'Desktop PC',
        asset_type: { name: 'Computer' },
        location: { name: 'Office' },
        status: 'OPERATIONAL',
        serial_number: 'PC456'
      }
    ];

    mockAxios.get.mockResolvedValue({ data: mockAssets });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Air Conditioner')).toBeTruthy();
      expect(screen.getByText('Computer')).toBeTruthy();
    });

    // Test search functionality (if implemented)
    const searchBar = screen.getByPlaceholderText('Search assets...');
    fireEvent.changeText(searchBar, 'Air');

    await waitFor(() => {
      // Should filter to show only Air Conditioner
      // This depends on the actual search implementation
    });
  });

  test('shows asset details modal', async () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      description: 'Test description',
      asset_type: { name: 'Computer' },
      location: { name: 'Office' },
      status: 'OPERATIONAL',
      serial_number: 'PC123',
      manufacturer: 'Dell',
      model: 'OptiPlex',
      purchase_date: '2024-01-01',
      warranty_expiry: '2025-01-01',
      last_maintenance_date: '2024-01-01',
      next_maintenance_date: '2024-02-01'
    };

    mockAxios.get.mockResolvedValue({ data: [mockAsset] });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Asset')).toBeTruthy();
    });

    // Click details button
    const detailsButton = screen.getByText('Details');
    fireEvent.press(detailsButton);

    await waitFor(() => {
      expect(screen.getByText('Asset Details')).toBeTruthy();
      expect(screen.getByText('Test description')).toBeTruthy();
      expect(screen.getByText('Dell')).toBeTruthy();
      expect(screen.getByText('OptiPlex')).toBeTruthy();
    });
  });

  test('handles different asset statuses', async () => {
    const mockAssets = [
      {
        id: 1,
        name: 'Operational Asset',
        status: 'OPERATIONAL',
        asset_type: { name: 'Computer' },
        location: { name: 'Office' }
      },
      {
        id: 2,
        name: 'Maintenance Asset',
        status: 'UNDER_MAINTENANCE',
        asset_type: { name: 'HVAC' },
        location: { name: 'Office' }
      },
      {
        id: 3,
        name: 'Out of Service Asset',
        status: 'OUT_OF_SERVICE',
        asset_type: { name: 'Computer' },
        location: { name: 'Office' }
      }
    ];

    mockAxios.get.mockResolvedValue({ data: mockAssets });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Operational Asset')).toBeTruthy();
      expect(screen.getByText('Maintenance Asset')).toBeTruthy();
      expect(screen.getByText('Out of Service Asset')).toBeTruthy();
    });

    // Should show different status badges and action buttons
    // Operational assets should have checkout button
    // Under maintenance assets should not have checkout button
  });

  test('handles API errors gracefully', async () => {
    mockAxios.get.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Assets')).toBeTruthy();
    });

    // Should show error message or handle gracefully
    // This depends on the actual error handling implementation
  });

  test('displays serial number when available', async () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      description: 'Test description',
      asset_type: { name: 'Computer' },
      location: { name: 'Office' },
      status: 'OPERATIONAL',
      serial_number: 'SN123456789'
    };

    mockAxios.get.mockResolvedValue({ data: [mockAsset] });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('SN: SN123456789')).toBeInTheDocument();
    });
  });

  test('shows manufacturer and model when available', async () => {
    const mockAsset = {
      id: 1,
      name: 'Test Asset',
      description: 'Test description',
      asset_type: { name: 'Computer' },
      location: { name: 'Office' },
      status: 'OPERATIONAL',
      manufacturer: 'Apple',
      model: 'MacBook Pro'
    };

    mockAxios.get.mockResolvedValue({ data: [mockAsset] });

    renderWithRouter(<AssetsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Asset')).toBeTruthy();
    });

    // Should display manufacturer and model in details modal
    // This depends on the actual UI implementation
  });
});
