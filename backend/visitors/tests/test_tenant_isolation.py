from django.contrib.auth.models import User
from rest_framework import status
from .base import BaseTestCase
from ..models import Visitor, Host, Location, UserProfile
from ..tenant_models import Tenant, TenantUser

class TenantIsolationTests(BaseTestCase):
    auto_login = False
    
    def setUp(self):
        super().setUp()
        # Tenant 1
        self.t1 = Tenant.objects.create(name="Tenant 1", slug="tenant-1", subdomain="tenant1")
        self.location.tenant = self.t1
        self.location.save()
        
        self.user1 = User.objects.create_user(username="user1", password="password123")
        self.profile1 = UserProfile.objects.create(user=self.user1, role="ADMIN", location=self.location)
        TenantUser.objects.create(tenant=self.t1, user=self.user1, role="ADMIN")
        
        # Tenant 2
        self.t2 = Tenant.objects.create(name="Tenant 2", slug="tenant-2", subdomain="tenant2")
        self.location2 = Location.objects.create(name="Location 2", tenant=self.t2)
        self.user2 = User.objects.create_user(username="user2", password="password123")
        self.profile2 = UserProfile.objects.create(user=self.user2, role="ADMIN", location=self.location2)
        TenantUser.objects.create(tenant=self.t2, user=self.user2, role="ADMIN")
        
        # Sync self.host to tenant 1
        self.host.tenant = self.t1
        self.host.save()
        
        # Data for Tenant 1
        self.visitor1 = Visitor.objects.create(
            name="Visitor T1", email="v1@t1.com", phone="1111111111",
            host=self.host, location=self.location, tenant=self.t1, status='PENDING'
        )
        
        # Data for Tenant 2
        self.host2 = Host.objects.create(name="Host T2", email="h2@t2.com", location=self.location2, tenant=self.t2)
        self.visitor2 = Visitor.objects.create(
            name="Visitor T2", email="v2@t2.com", phone="2222222222",
            host=self.host2, location=self.location2, tenant=self.t2, status='PENDING'
        )

    def login_as(self, user):
        """Helper to login as a specific user using JWT."""
        response = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'password123'})
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_user1_cannot_see_tenant2_data(self):
        self.login_as(self.user1)
        
        # Check visitors
        response = self.client.get('/api/visitors/')
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Visitor T1")
        
        # Check locations
        response = self.client.get('/api/locations/')
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "HQ")

    def test_user2_cannot_see_tenant1_data(self):
        self.login_as(self.user2)
        
        # Check visitors
        response = self.client.get('/api/visitors/')
        results = response.data.get('results', [])
        # Critical failure before: saw Visitor T1 because BaseTestCase was logged in as super_admin
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Visitor T2")

    def test_cross_tenant_approval_denied(self):
        """User 1 should not be able to approve User 2's visitor even if they know the ID."""
        self.login_as(self.user1)
        response = self.client.post(f'/api/visitors/{self.visitor2.id}/approve/')
        # Should be 404 because it's not in the filtered queryset
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_audit_fields_populated_on_approval(self):
        self.login_as(self.user1)
        response = self.client.post(f'/api/visitors/{self.visitor1.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.visitor1.refresh_from_db()
        self.assertEqual(self.visitor1.status, 'CHECKED_IN')
        self.assertEqual(self.visitor1.approved_by, self.user1)
        self.assertIsNotNone(self.visitor1.approved_at)
