from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from visitors.models import Location, Host, PreRegistration
from visitors.tenant_models import Tenant, TenantUser
from django.contrib.auth.models import User

class PreRegistrationIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Tenant A setup
        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a", subdomain="tenant-a")
        self.loc_a = Location.objects.create(name="HQ A", tenant=self.tenant_a, timezone="UTC")
        self.host_user_a = User.objects.create_user(username="host_a", password="password")
        TenantUser.objects.create(tenant=self.tenant_a, user=self.host_user_a, role="HOST")
        self.host_a = Host.objects.create(name="Host A", email="host_a@tenant-a.com", user=self.host_user_a, location=self.loc_a, tenant=self.tenant_a)

        # Tenant B setup
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b", subdomain="tenant-b")
        self.loc_b = Location.objects.create(name="HQ B", tenant=self.tenant_b, timezone="UTC")
        self.host_user_b = User.objects.create_user(username="host_b", password="password")
        TenantUser.objects.create(tenant=self.tenant_b, user=self.host_user_b, role="HOST")
        self.host_b = Host.objects.create(name="Host B", email="host_b@tenant-b.com", user=self.host_user_b, location=self.loc_b, tenant=self.tenant_b)

        # Create PreRegistrations
        self.pre_reg_a = PreRegistration.objects.create(
            visitor_name="Guest A",
            visitor_email="guest_a@test.com",
            host=self.host_a,
            location=self.loc_a,
            tenant=self.tenant_a,
            expected_arrival=timezone.now() + timedelta(days=1)
        )
        self.pre_reg_b = PreRegistration.objects.create(
            visitor_name="Guest B",
            visitor_email="guest_b@test.com",
            host=self.host_b,
            location=self.loc_b,
            tenant=self.tenant_b,
            expected_arrival=timezone.now() + timedelta(days=1)
        )

    def login_as(self, username):
        user = User.objects.get(username=username)
        self.client.force_authenticate(user=user)

    def test_host_only_sees_own_tenant_pre_registrations(self):
        self.login_as("host_a")
        response = self.client.get('/api/pre-registrations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Depending on API logic, it might return only their own, or all for the tenant.
        # But it should DEFINITELY not return Tenant B's.
        results = response.data.get('results', response.data)
        
        for invite in results:
            self.assertNotEqual(invite['visitor_email'], "guest_b@test.com")
            
    def test_pre_registration_scan_across_tenants(self):
        # A kiosk (unauthenticated or with Kiosk role) normally calls scan
        # Since scan takes just a token, it might not be strictly tenant-bound 
        # unless it checks if the token belongs to the scanning kiosk's tenant.
        # Let's verify standard token lookup API works.
        response = self.client.post('/api/pre-registrations/scan/', {'token': str(self.pre_reg_a.token)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['visitor_email'], "guest_a@test.com")
