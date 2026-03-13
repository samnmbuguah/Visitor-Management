from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from ..models import Location, Kiosk, Host, UserProfile
from ..tenant_models import Tenant, TenantUser

class BaseTestCase(TestCase):
    auto_login = True

    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Default Tenant", slug="default", subdomain="default")
        self.location = Location.objects.create(name="HQ", address="123 Main St", floor="1", timezone="UTC", tenant=self.tenant)
        self.kiosk = Kiosk.objects.create(name="Lobby Kiosk", location=self.location, tenant=self.tenant)
        self.host = Host.objects.create(
            name="Alice Host",
            email="alice@example.com",
            department="Engineering",
            phone="1234567890",
            location=self.location,
            tenant=self.tenant
        )
        self.user = User.objects.create_user(username="admin", password="password123")
        self.profile = UserProfile.objects.create(user=self.user, role="SUPER_ADMIN", location=self.location)
        TenantUser.objects.create(tenant=self.tenant, user=self.user, role="SUPER_ADMIN")
        
        # Authenticate client by default if flag is set
        if self.auto_login:
            self.login_admin()

    def create_user(self, username, email, password, role, location=None):
        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, role=role, location=location or self.location)
        TenantUser.objects.create(tenant=self.tenant, user=user, role=role)
        return user

    def login_admin(self):
        self.client.force_authenticate(user=self.user)

    def login_host(self):
        if hasattr(self.host, 'user') and self.host.user:
            self.client.force_authenticate(user=self.host.user)
        else:
            host_user = User.objects.create_user(username="host_user", password="password123")
            self.host.user = host_user
            self.host.save()
            UserProfile.objects.create(user=host_user, role="HOST", location=self.location)
            TenantUser.objects.create(tenant=self.tenant, user=host_user, role="HOST")
            self.client.force_authenticate(user=host_user)
