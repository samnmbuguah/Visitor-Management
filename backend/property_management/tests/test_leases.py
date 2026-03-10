from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from visitors.models import Tenant, Location, UserProfile, TenantUser
from property_management.models import Lease

class LeaseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create tenants
        self.tenant1 = Tenant.objects.create(name="Tenant 1", slug="t1", subdomain="t1")
        self.tenant2 = Tenant.objects.create(name="Tenant 2", slug="t2", subdomain="t2")
        
        # Create locations
        self.loc1 = Location.objects.create(tenant=self.tenant1, name="Loc 1")
        self.loc2 = Location.objects.create(tenant=self.tenant2, name="Loc 2")
        
        # Create users
        self.user1 = User.objects.create_user(username="user1", password="pass", email="u1@t1.com")
        self.user2 = User.objects.create_user(username="user2", password="pass", email="u2@t2.com")
        
        # Create profiles
        UserProfile.objects.create(user=self.user1, location=self.loc1, role='ADMIN')
        UserProfile.objects.create(user=self.user2, location=self.loc2, role='ADMIN')
        
        # Create TenantUsers
        TenantUser.objects.create(user=self.user1, tenant=self.tenant1, role='ADMIN')
        TenantUser.objects.create(user=self.user2, tenant=self.tenant2, role='ADMIN')
        
        # Create leases
        self.lease1 = Lease.objects.create(
            tenant=self.tenant1,
            unit_number="101",
            monthly_rent=1000.00,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            status='ACTIVE'
        )
        
        self.lease2 = Lease.objects.create(
            tenant=self.tenant2,
            unit_number="202",
            monthly_rent=2000.00,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=365)).date(),
            status='ACTIVE'
        )

    def test_lease_list_tenant_isolation(self):
        """Test that users only see leases belonging to their tenant."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/property-management/leases/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results is paginated
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['unit_number'], "101")
        
        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/property-management/leases/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['unit_number'], "202")

    def test_create_lease_enforces_tenant(self):
        """Test that creating a lease automatically sets the tenant to the user's tenant."""
        self.client.force_authenticate(user=self.user1)
        data = {
            'unit_number': '103',
            'monthly_rent': 1500.00,
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'status': 'ACTIVE'
        }
        response = self.client.post('/api/property-management/leases/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        lease = Lease.objects.get(unit_number='103')
        self.assertEqual(lease.tenant, self.tenant1)

    def test_cannot_access_other_tenant_lease(self):
        """Test that a user cannot retrieve or modify a lease from another tenant."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/property-management/leases/{self.lease2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        response = self.client.patch(f'/api/property-management/leases/{self.lease2.id}/', {'unit_number': 'HACKED'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
