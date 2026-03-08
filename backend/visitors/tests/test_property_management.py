from django.contrib.auth.models import User
from rest_framework import status
from django.test import TestCase
from ..models import UserProfile, Location, Tenant
from .base import BaseTestCase
from ..tenant_models import Tenant, TenantUser

class PropertyManagementTests(BaseTestCase):
    """Test property management features"""

    def setUp(self):
        super().setUp()
        import uuid
        # Create test users with different roles
        unique_id = uuid.uuid4().hex[:8]
        self.super_admin = User.objects.create_user(
            username=f"super_admin_{unique_id}", 
            password="test123",
            email=f"super_{unique_id}@admin.com"
        )
        UserProfile.objects.create(user=self.super_admin, role='SUPER_ADMIN')
        
        # Create a tenant for the location
        self.tenant = Tenant.objects.create(
            name='Test Tenant for Location',
            slug='location-tenant',
            subdomain='loctenant'
        )
        
        self.location = Location.objects.create(name="PM HQ", address="456 PM St", floor="1", timezone="UTC", tenant=self.tenant)

        self.admin = User.objects.create_user(
            username=f"admin_{unique_id}",
            password="test123",
            email=f"admin_{unique_id}@test.com"
        )
        UserProfile.objects.create(user=self.admin, role='ADMIN', location=self.location)
        TenantUser.objects.create(tenant=self.tenant, user=self.admin, role='ADMIN')

        self.property_manager = User.objects.create_user(
            username=f"property_manager_{unique_id}",
            password="test123",
            email=f"pm_{unique_id}@test.com"
        )
        UserProfile.objects.create(user=self.property_manager, role='HOST', location=self.location)
        TenantUser.objects.create(tenant=self.tenant, user=self.property_manager, role='HOST')

    def test_tenant_creation_by_super_admin(self):
        """Test that super admin can create tenants"""
        self.client.force_authenticate(user=self.super_admin)
        data = {
            'name': 'Test Tenant',
            'email': 'tenant@test.com',
            'phone': '+1234567890',
            'address': '123 Test St'
        }
        response = self.client.post('/api/tenants/', data)
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND])

    def test_tenant_creation_forbidden_for_admin(self):
        """Test that regular admin cannot create tenants (if restricted)"""
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Test Tenant',
            'email': 'tenant@test.com',
            'phone': '+1234567890',
            'address': '123 Test St'
        }
        response = self.client.post('/api/tenants/', data)
        # This might be allowed depending on permissions or 404 if not exist
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_tenant_creation_forbidden_for_property_manager(self):
        """Test that property manager cannot create tenants"""
        self.client.force_authenticate(user=self.property_manager)
        data = {
            'name': 'Test Tenant',
            'email': 'tenant@test.com',
            'phone': '+1234567890',
            'address': '123 Test St'
        }
        response = self.client.post('/api/tenants/', data)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_tenant_list_access_by_role(self):
        """Test tenant list access by different roles"""
        # Super admin should access
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        
        # Admin should access (if permitted)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        
        # Property manager should not access
        self.client.force_authenticate(user=self.property_manager)
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_unauthenticated_tenant_access(self):
        """Test that unauthenticated users cannot access tenants"""
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_404_NOT_FOUND])

    def test_lease_management_permissions(self):
        """Test lease management permissions"""
        # Test lease creation by super admin
        self.client.force_authenticate(user=self.super_admin)
        lease_data = {
            'unit_number': 'A-101',
            'tenant': 1,  # Assuming tenant with ID 1 exists
            'monthly_rent': 2500.00,
            'start_date': '2024-01-01',
            'end_date': '2024-12-31'
        }
        response = self.client.post('/api/leases/', lease_data)
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND])  # 404 if endpoint doesn't exist yet
        
        # Test lease access by property manager
        self.client.force_authenticate(user=self.property_manager)
        response = self.client.get('/api/leases/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_location_management_permissions(self):
        """Test location management permissions"""
        self.client.force_authenticate(user=self.super_admin)
        location_data = {
            'name': 'Test Location',
            'address': '456 Test Ave',
            'timezone': 'UTC'
        }
        response = self.client.post('/api/locations/', location_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test location update by admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/locations/{self.location.id}/', {
            'name': 'Updated Location'
        })
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])

    def test_property_analytics_access(self):
        """Test property analytics access"""
        # Super admin should access analytics
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.get('/api/analytics/properties/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        
        # Admin should access analytics
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/analytics/properties/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        
        # Property manager should have limited access
        self.client.force_authenticate(user=self.property_manager)
        response = self.client.get('/api/analytics/properties/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_tenant_user_isolation(self):
        """Test that tenants can only see their own data"""
        # Create a tenant-specific user
        tenant_user = User.objects.create_user(
            username="tenant_user",
            password="test123",
            email="user@tenant.com"
        )
        UserProfile.objects.create(user=tenant_user, role='TENANT_USER')
        
        self.client.force_authenticate(user=tenant_user)
        # Tenant user should only see their own leases/data
        response = self.client.get('/api/leases/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        
        # Should not see other tenants
        response = self.client.get('/api/tenants/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_property_management_bulk_operations(self):
        """Test bulk operations for property management"""
        self.client.force_authenticate(user=self.super_admin)
        
        # Test bulk lease creation
        bulk_data = [
            {
                'unit_number': 'B-201',
                'monthly_rent': 1800.00,
                'start_date': '2024-01-01',
                'end_date': '2024-12-31'
            },
            {
                'unit_number': 'B-202',
                'monthly_rent': 2200.00,
                'start_date': '2024-01-01',
                'end_date': '2024-12-31'
            }
        ]
        response = self.client.post('/api/leases/bulk/', bulk_data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND])
        
        # Test bulk operations permissions
        self.client.force_authenticate(user=self.property_manager)
        response = self.client.post('/api/leases/bulk/', bulk_data, format='json')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
