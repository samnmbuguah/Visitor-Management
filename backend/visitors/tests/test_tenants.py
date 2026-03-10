from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from visitors.models import Tenant, UserProfile, Location, TenantUser

class TenantTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create tenants
        self.tenant1 = Tenant.objects.create(name="Tenant 1", slug="t1", subdomain="t1")
        self.tenant2 = Tenant.objects.create(name="Tenant 2", slug="t2", subdomain="t2")
        
        # Create locations
        self.loc1 = Location.objects.create(tenant=self.tenant1, name="Loc 1")
        self.loc2 = Location.objects.create(tenant=self.tenant2, name="Loc 2")
        
        # Create users
        self.admin = User.objects.create_superuser(username="admin", password="pass", email="admin@test.com")
        self.user1 = User.objects.create_user(username="user1", password="pass", email="u1@t1.com")
        
        # Create profile
        UserProfile.objects.create(user=self.user1, location=self.loc1, role='ADMIN')
        
        # Create TenantUser
        TenantUser.objects.create(user=self.user1, tenant=self.tenant1, role='ADMIN')

    def test_tenant_list_superuser(self):
        """Superuser should see all tenants."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/tenants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Assuming total_count or results length
        results = response.data.get('results', response.data)
        self.assertTrue(len(results) >= 2)

    def test_tenant_list_regular_admin(self):
        """Regular admin should only see their own tenant in the list (or be restricted)."""
        # Based on current implementation, let's see what happens
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/tenants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], "t1")

    def test_tenant_detail_isolation(self):
        """Admin should not be able to access other tenant details."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/tenants/{self.tenant2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
