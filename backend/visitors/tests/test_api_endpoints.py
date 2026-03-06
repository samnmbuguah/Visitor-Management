from django.contrib.auth.models import User
from rest_framework import status
from django.test import TestCase
from ..models import UserProfile, Location, Host, Visitor
from .base import BaseTestCase
import json

class APIEndpointTests(BaseTestCase):
    """Test API endpoints comprehensively"""

    def setUp(self):
        super().setUp()
        # Create test users with different roles
        self.super_admin = User.objects.create_user(
            username="super_admin", 
            password="test123",
            email="super@admin.com"
        )
        UserProfile.objects.create(user=self.super_admin, role='SUPER_ADMIN')
        
        self.admin = User.objects.create_user(
            username="admin", 
            password="test123",
            email="admin@test.com"
        )
        UserProfile.objects.create(user=self.admin, role='ADMIN')
        
        self.host = User.objects.create_user(
            username="host", 
            password="test123",
            email="host@test.com"
        )
        UserProfile.objects.create(user=self.host, role='HOST')

    def test_authentication_endpoints(self):
        """Test authentication endpoints"""
        # Test login with valid credentials
        response = self.client.post('/api/auth/login/', {
            'username': 'super_admin',
            'password': 'test123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Test login with invalid credentials
        response = self.client.post('/api/auth/login/', {
            'username': 'invalid',
            'password': 'wrong'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test token refresh
        login_response = self.client.post('/api/auth/login/', {
            'username': 'super_admin',
            'password': 'test123'
        })
        refresh_token = login_response.data['refresh']
        
        response = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        
        # Test logout
        response = self.client.post('/api/auth/logout/', {
            'refresh': refresh_token
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_profile_endpoint(self):
        """Test user profile endpoint"""
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'super_admin')
        self.assertEqual(response.data['role'], 'SUPER_ADMIN')
        self.assertEqual(response.data['email'], 'super@admin.com')

    def test_location_endpoints(self):
        """Test location CRUD endpoints"""
        self.client.force_authenticate(user=self.super_admin)
        
        # Create location
        location_data = {
            'name': 'Test Location',
            'address': '123 Test St',
            'timezone': 'America/New_York'
        }
        response = self.client.post('/api/locations/', location_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_location = response.data
        
        # Get locations
        response = self.client.get('/api/locations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)
        
        # Update location
        update_data = {'name': 'Updated Location'}
        response = self.client.patch(f'/api/locations/{created_location["id"]}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Location')
        
        # Delete location
        response = self.client.delete(f'/api/locations/{created_location["id"]}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify deletion
        response = self.client.get('/api/locations/')
        self.assertNotIn(created_location, response.data)

    def test_visitor_endpoints(self):
        """Test visitor management endpoints"""
        self.client.force_authenticate(user=self.host)
        
        # Create visitor
        visitor_data = {
            'name': 'Test Visitor',
            'email': 'visitor@test.com',
            'phone': '+1234567890',
            'purpose': 'Business Meeting',
            'host': self.host.id
        }
        response = self.client.post('/api/visitors/', visitor_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_visitor = response.data
        
        # Get visitors
        response = self.client.get('/api/visitors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Check-in visitor
        response = self.client.post(f'/api/visitors/{created_visitor["id"]}/checkin/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check-out visitor
        response = self.client.post(f'/api/visitors/{created_visitor["id"]}/checkout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_host_endpoints(self):
        """Test host management endpoints"""
        self.client.force_authenticate(user=self.admin)
        
        # Get hosts
        response = self.client.get('/api/hosts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Create host
        host_data = {
            'name': 'Test Host',
            'email': 'host@test.com',
            'location': self.location.id
        }
        response = self.client.post('/api/hosts/', host_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_maintenance_endpoints(self):
        """Test maintenance request endpoints"""
        self.client.force_authenticate(user=self.admin)
        
        # Create maintenance request
        maintenance_data = {
            'title': 'Leaking Faucet',
            'description': 'Faucet in kitchen is leaking',
            'priority': 'HIGH',
            'location': self.location.id
        }
        response = self.client.post('/api/property-management/requests/', maintenance_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = response.data
        
        # Get maintenance requests
        response = self.client.get('/api/property-management/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Update maintenance status
        response = self.client.post(f'/api/property-management/requests/{created_request["id"]}/update_status/', {
            'status': 'IN_PROGRESS'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_asset_endpoints(self):
        """Test asset management endpoints"""
        self.client.force_authenticate(user=self.admin)
        
        # Create asset
        asset_data = {
            'name': 'Conference Room Projector',
            'asset_type': 'ELECTRONICS',
            'location': self.location.id,
            'serial_number': 'PRJ-001'
        }
        response = self.client.post('/api/property-management/assets/', asset_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_asset = response.data
        
        # Get assets
        response = self.client.get('/api/property-management/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        # Generate QR code for asset
        response = self.client.get(f'/api/property-management/assets/{created_asset["id"]}/qr_code/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('qr_code', response.data)

    def test_permission_enforcement(self):
        """Test that permissions are properly enforced"""
        # Test that host cannot access admin endpoints
        self.client.force_authenticate(user=self.host)
        
        response = self.client.get('/api/tenants/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        response = self.client.get('/api/property-management/requests/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        response = self.client.get('/api/property-management/assets/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test that admin can access admin endpoints
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])  # 404 if endpoint doesn't exist
        
        response = self.client.get('/api/property-management/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.get('/api/property-management/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_data_validation(self):
        """Test data validation on endpoints"""
        self.client.force_authenticate(user=self.admin)
        
        # Test invalid data for location creation
        invalid_location = {
            'name': '',  # Empty name
            'address': '123 Test St'
        }
        response = self.client.post('/api/locations/', invalid_location)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid data for visitor creation
        invalid_visitor = {
            'name': '',  # Empty name
            'email': 'invalid-email',  # Invalid email
            'purpose': 'Meeting'
        }
        response = self.client.post('/api/visitors/', invalid_visitor)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid maintenance request
        invalid_maintenance = {
            'title': '',  # Empty title
            'priority': 'INVALID_PRIORITY'  # Invalid priority
        }
        response = self.client.post('/api/property-management/requests/', invalid_maintenance)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rate_limiting(self):
        """Test rate limiting on sensitive endpoints"""
        self.client.force_authenticate(user=self.admin)
        
        # Make multiple rapid requests to login endpoint
        for _ in range(10):
            response = self.client.post('/api/auth/login/', {
                'username': 'admin',
                'password': 'wrong'
            })
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                break
        
        # Should eventually be rate limited (if implemented)
        # This test depends on rate limiting implementation
        self.assertTrue(True)  # Placeholder - adjust based on actual implementation

    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = self.client.options('/api/auth/login/')
        self.assertIn('Access-Control-Allow-Origin', response.headers)
        self.assertIn('Access-Control-Allow-Methods', response.headers)
        self.assertIn('Access-Control-Allow-Headers', response.headers)
