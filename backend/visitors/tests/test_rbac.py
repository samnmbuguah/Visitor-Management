from django.contrib.auth.models import User
from rest_framework import status
from ..models import Host, UserProfile, Visitor
from ..tenant_models import TenantUser
from .base import BaseTestCase

class RBACTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        # Create a Host user
        self.host_user = User.objects.create_user(username="host_user", password="password123")
        self.host_profile = UserProfile.objects.create(
            user=self.host_user, 
            role="HOST", 
            location=self.location
        )
        TenantUser.objects.create(tenant=self.tenant, user=self.host_user, role="HOST")
        self.host_record = Host.objects.create(
            name="Host User",
            email="host@example.com",
            user=self.host_user,
            location=self.location,
            tenant=self.tenant
        )

        # Create an Admin user
        self.admin_user = User.objects.create_user(username="admin_user", password="password123")
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user, 
            role="ADMIN", 
            location=self.location
        )
        TenantUser.objects.create(tenant=self.tenant, user=self.admin_user, role="ADMIN")
        # Create admin host profile for admin user
        self.admin_host = Host.objects.create(
            name="Admin Host",
            email="admin@example.com",
            user=self.admin_user,
            location=self.location,
            tenant=self.tenant
        )

        # Create some visitors
        self.visitor_for_host = Visitor.objects.create(
            name="Host's Guest",
            email="guest1@example.com",
            phone="123",
            host=self.host_record,
            location=self.location,
            tenant=self.tenant,
            purpose="Meeting"
        )
        
        self.other_host = Host.objects.create(
            name="Other Host",
            email="other@example.com",
            location=self.location,
            tenant=self.tenant
        )
        self.visitor_for_other = Visitor.objects.create(
            name="Other's Guest",
            email="guest2@example.com",
            phone="456",
            host=self.other_host,
            location=self.location,
            tenant=self.tenant,
            purpose="Interview"
        )

    def login_as(self, username):
        user = User.objects.get(username=username)
        self.client.force_authenticate(user=user)

    def test_host_can_only_see_own_visitors(self):
        self.login_as("host_user")
        response = self.client.get('/api/visitors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        # Host should only see their own visitor
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Host's Guest")

    def test_admin_can_see_all_location_visitors(self):
        self.login_as("admin_user")
        response = self.client.get('/api/visitors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_host_cannot_see_watchlist(self):
        self.login_as("host_user")
        response = self.client.get('/api/watchlist/')
        # Based on ViewSet, it returns empty or empty list for non-admins
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_host_can_approve_own_visitor(self):
        self.login_as("host_user")
        self.visitor_for_host.status = 'PENDING'
        self.visitor_for_host.save()
        
        response = self.client.post(f'/api/visitors/{self.visitor_for_host.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visitor_for_host.refresh_from_db()
        self.assertEqual(self.visitor_for_host.status, 'CHECKED_IN')

    def test_host_cannot_approve_others_visitor(self):
        self.login_as("host_user")
        self.visitor_for_other.status = 'PENDING'
        self.visitor_for_other.save()
        
        # Host cannot see other host's visitor in their queryset, so it should be 404
        response = self.client.post(f'/api/visitors/{self.visitor_for_other.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
