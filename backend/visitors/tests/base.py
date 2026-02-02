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
        response = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'password123'})
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
