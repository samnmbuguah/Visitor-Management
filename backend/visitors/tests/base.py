from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from ..models import Location, Kiosk, Host, UserProfile

class BaseTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.location = Location.objects.create(name="HQ", address="123 Main St", floor="1", timezone="UTC")
        self.kiosk = Kiosk.objects.create(name="Lobby Kiosk", location=self.location)
        self.host = Host.objects.create(
            name="Alice Host",
            email="alice@example.com",
            department="Engineering",
            phone="1234567890",
            location=self.location
        )
        self.user = User.objects.create_user(username="admin", password="password123")
        self.profile = UserProfile.objects.create(user=self.user, role="SUPER_ADMIN", location=self.location)
        
        # Authenticate client
        self.login_admin()

    def create_user(self, username, email, password, role, location=None):
        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, role=role, location=location or self.location)
        return user

    def login_admin(self):
        self.client.force_authenticate(user=self.user)

    def login_host(self):
        # Find a user with a host profile or the default host created in setUp
        if hasattr(self.host, 'user') and self.host.user:
            self.client.force_authenticate(user=self.host.user)
        else:
            # Create a user for the host if none exists
            host_user = User.objects.create_user(username="host_user", password="password123")
            self.host.user = host_user
            self.host.save()
            UserProfile.objects.create(user=host_user, role="HOST", location=self.location)
            self.client.force_authenticate(user=host_user)
