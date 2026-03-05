from django.urls import reverse
from rest_framework import status
from .base import BaseTestCase
from ..models import Parcel, Host, UserRole

class ParcelTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.parcel_data = {
            'recipient': self.host.id,
            'courier': 'FedEx',
            'tracking_number': '12345678',
            'location': self.location.id
        }

    def test_create_parcel(self):
        self.login_admin()
        url = reverse('parcel-list')
        response = self.client.post(url, self.parcel_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Parcel.objects.count(), 1)
        self.assertEqual(Parcel.objects.first().courier, 'FedEx')

    def test_collect_parcel(self):
        parcel = Parcel.objects.create(
            recipient=self.host,
            location=self.location,
            courier='DHL',
            status='RECEIVED'
        )
        self.login_host()
        url = reverse('parcel-collect', args=[parcel.id])
        data = {'collection_signature': 'base64-signature'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        parcel.refresh_from_db()
        self.assertEqual(parcel.status, 'COLLECTED')
        self.assertIsNotNone(parcel.collected_at)

    def test_rbac_parcels(self):
        parcel = Parcel.objects.create(
            recipient=self.host,
            location=self.location,
            courier='UPS',
            status='RECEIVED'
        )
        
        # Another host should not see this parcel
        other_user = self.create_user('other_host', 'host@example.com', 'pass123', UserRole.HOST)
        self.client.force_authenticate(user=other_user)
        url = reverse('parcel-list')
        response = self.client.get(url)
        self.assertEqual(len(response.data['results']), 0)
        
        # The assigned host should see it
        self.login_host()
        response = self.client.get(url)
        self.assertEqual(len(response.data['results']), 1)
