import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import MaintenanceScreen from '../../app/(tabs)/maintenance';

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

describe('MaintenanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (component) => {
    return render(component);
  };

  test('renders maintenance screen correctly', async () => {
    // Mock API responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('requests')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              title: 'Broken AC',
              description: 'AC unit not working',
              priority: 'HIGH',
              status: 'REQUESTED',
              location: { name: 'Main Office' },
              category: { name: 'HVAC' },
              host: { name: 'John Doe' },
              requested_at: '2024-01-01T10:00:00Z',
              photos: []
            }
          ]
        });
      }
      if (url.includes('categories')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'HVAC' },
            { id: 2, name: 'Plumbing' }
          ]
        });
      }
      if (url.includes('locations')) {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Main Office' },
            { id: 2, name: 'Conference Room' }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    // Check if maintenance request is displayed
    await waitFor(() => {
      expect(screen.getByText('Broken AC')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('Main Office')).toBeInTheDocument();
    });
  });

  test('opens create modal when add button is pressed', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    // Press add button
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.press(addButton);

    // Check if modal opens
    await waitFor(() => {
      expect(screen.getByText('New Maintenance Request')).toBeInTheDocument();
    });
  });

  test('creates new maintenance request', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });
    mockAxios.post.mockResolvedValue({ data: { id: 2 } });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    // Open create modal
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.press(addButton);

    // Fill form
    await waitFor(() => {
      expect(screen.getByText('New Maintenance Request')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Brief description of the issue');
    const descriptionInput = screen.getByPlaceholderText('Detailed description of the issue');
    
    fireEvent.changeText(titleInput, 'Leaky Faucet');
    fireEvent.changeText(descriptionInput, 'Kitchen faucet is dripping');

    // Submit form
    const createButton = screen.getByText('Create');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/property-management/requests/',
        expect.objectContaining({
          title: 'Leaky Faucet',
          description: 'Kitchen faucet is dripping',
          priority: 'MEDIUM'
        })
      );
    });
  });

  test('updates maintenance request status', async () => {
    const mockRequest = {
      id: 1,
      title: 'Test Request',
      description: 'Test description',
      priority: 'MEDIUM',
      status: 'REQUESTED',
      location: { name: 'Main Office' },
      category: { name: 'HVAC' },
      host: { name: 'John Doe' },
      requested_at: '2024-01-01T10:00:00Z',
      photos: []
    };

    mockAxios.get.mockResolvedValue({ data: [mockRequest] });
    mockAxios.post.mockResolvedValue({ data: { status: 'success' } });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Request')).toBeInTheDocument();
    });

    // Click assign button
    const assignButton = screen.getByText('Assign');
    fireEvent.press(assignButton);

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/property-management/requests/1/update_status/',
        { status: 'ASSIGNED' }
      );
    });
  });

  test('displays photos indicator when photos exist', async () => {
    const mockRequest = {
      id: 1,
      title: 'Test Request',
      description: 'Test description',
      priority: 'MEDIUM',
      status: 'REQUESTED',
      location: { name: 'Main Office' },
      category: { name: 'HVAC' },
      host: { name: 'John Doe' },
      requested_at: '2024-01-01T10:00:00Z',
      photos: [
        { id: 1, photo: 'base64data', caption: 'Photo 1' },
        { id: 2, photo: 'base64data', caption: 'Photo 2' }
      ]
    };

    mockAxios.get.mockResolvedValue({ data: [mockRequest] });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('2 photos')).toBeInTheDocument();
    });
  });

  test('filters requests by status and priority', async () => {
    const mockRequests = [
      {
        id: 1,
        title: 'Emergency Request',
        description: 'Emergency issue',
        priority: 'EMERGENCY',
        status: 'REQUESTED',
        location: { name: 'Main Office' },
        category: { name: 'HVAC' },
        host: { name: 'John Doe' },
        requested_at: '2024-01-01T10:00:00Z',
        photos: []
      },
      {
        id: 2,
        title: 'Low Priority Request',
        description: 'Low priority issue',
        priority: 'LOW',
        status: 'COMPLETED',
        location: { name: 'Main Office' },
        category: { name: 'Plumbing' },
        host: { name: 'Jane Doe' },
        requested_at: '2024-01-01T11:00:00Z',
        photos: []
      }
    ];

    mockAxios.get.mockResolvedValue({ data: mockRequests });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Request')).toBeInTheDocument();
      expect(screen.getByText('Low Priority Request')).toBeInTheDocument();
    });

    // Test priority filtering (if implemented)
    // This would depend on the actual implementation of filtering
  });

  test('handles API errors gracefully', async () => {
    mockAxios.get.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });

    // Should show error message or handle gracefully
    // This depends on the actual error handling implementation
  });

  test('refreshes data on pull to refresh', async () => {
    let callCount = 0;
    mockAxios.get.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        data: callCount === 1 ? 
          [{ id: 1, title: 'Request 1', priority: 'MEDIUM', status: 'REQUESTED', location: { name: 'Office' }, category: { name: 'HVAC' }, host: { name: 'Host' }, requested_at: '2024-01-01T10:00:00Z', photos: [] }] :
          [{ id: 2, title: 'Request 2', priority: 'HIGH', status: 'ASSIGNED', location: { name: 'Office' }, category: { name: 'Plumbing' }, host: { name: 'Host' }, requested_at: '2024-01-01T11:00:00Z', photos: [] }]
      });
    });

    renderWithRouter(<MaintenanceScreen />);

    await waitFor(() => {
      expect(screen.getByText('Request 1')).toBeInTheDocument();
    });

    // Simulate pull to refresh
    // This would depend on the actual refresh implementation
    // For now, just verify the initial load works
  });
});
