from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from datetime import timedelta
from ..models import (
    Host, Visitor, Location, Kiosk, UserProfile,
    NotificationTemplate, NotificationLog, PreRegistration
)
from ..services.qrcode_service import QRCodeService
from .base import BaseTestCase
from rest_framework.test import APIClient


class VisitorTests(BaseTestCase):
    def test_create_visitor(self):
        data = {
            "name": "Bob Visitor",
            "email": "bob@example.com",
            "phone": "0987654321",
            "host": self.host.id,
            "purpose": "Interview",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Visitor.objects.count(), 1)
        self.assertEqual(Visitor.objects.first().status, "CHECKED_IN")

    def test_checkout_visitor(self):
        visitor = Visitor.objects.create(
            name="Charlie Visitor",
            email="charlie@example.com",
            phone="1122334455",
            host=self.host,
            purpose="Meeting",
            location=self.location
        )
        response = self.client.post(f'/api/visitors/{visitor.id}/checkout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visitor.refresh_from_db()
        self.assertEqual(visitor.status, "CHECKED_OUT")
        self.assertIsNotNone(visitor.checkout_time)


class LocationTests(BaseTestCase):
    def test_create_location(self):
        data = {"name": "Branch Office", "address": "456 Side St", "timezone": "UTC"}
        response = self.client.post('/api/locations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Location.objects.count(), 2)

    def test_get_locations(self):
        response = self.client.get('/api/locations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class AnalyticsTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        # Create some historical visitor data
        today = timezone.now()
        for i in range(5):
            Visitor.objects.create(
                name=f"Visitor {i}",
                email=f"v{i}@example.com",
                phone="123",
                host=self.host,
                purpose="Meeting",
                location=self.location,
                checkin_time=today - timedelta(days=i)
            )

    def test_dashboard_stats(self):
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_locations", response.data)
        self.assertIn("active_visitors", response.data)

    def test_visitor_trends(self):
        response = self.client.get('/api/analytics/visitors/?days=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['data']), 0)


class NotificationTests(BaseTestCase):
    def test_notification_template_creation(self):
        data = {
            "name": "Welcome Email",
            "type": "VISITOR_ARRIVAL",
            "subject": "Welcome {{visitor_name}}",
            "body": "Hello {{host_name}}, your visitor has arrived.",
            "location": self.location.id
        }
        response = self.client.post('/api/notification-templates/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(NotificationTemplate.objects.count(), 1)

    def test_checkin_triggers_notification(self):
        # Create template first
        NotificationTemplate.objects.create(
            name="Arrival Alert",
            type="VISITOR_ARRIVAL",
            subject="Visitor Arrived",
            body="Your visitor is here.",
            location=self.location
        )
        
        # Create visitor (should trigger notification)
        data = {
            "name": "Dave",
            "email": "dave@example.com",
            "phone": "555555",
            "host": self.host.id,
            "purpose": "Delivery",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if notification was logged
        self.assertEqual(NotificationLog.objects.count(), 1)
        log = NotificationLog.objects.first()
        self.assertEqual(log.recipient_email, self.host.email)
        self.assertEqual(log.status, "SENT")  # Using console backend, so it 'sends'


class ApprovalTests(BaseTestCase):
    def test_approval_flow(self):
        # 1. Enable approval on location
        self.location.require_visitor_approval = True
        self.location.save()

        # 2. Visitor checks in
        data = {
            "name": "Pending Visitor",
            "email": "pending@example.com",
            "phone": "123",
            "host": self.host.id,
            "purpose": "Visit",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        visitor_id = response.data['id']
        self.assertEqual(response.data['status'], 'PENDING')
        
        # 3. Host approves
        response = self.client.post(f'/api/visitors/{visitor_id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'CHECKED_IN')

    def test_rejection_flow(self):
        self.location.require_visitor_approval = True
        self.location.save()

        data = {
            "name": "Rejected Visitor",
            "email": "rejected@example.com",
            "phone": "123",
            "host": self.host.id,
            "purpose": "Visit",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        visitor_id = response.data['id']
        
        # Connection rejected
        response = self.client.post(f'/api/visitors/{visitor_id}/reject/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'REJECTED')


class PreRegistrationTests(BaseTestCase):
    def test_create_invite(self):
        data = {
            "visitor_name": "Invited Guest",
            "visitor_email": "guest@example.com",
            "host": self.host.id,
            "location": self.location.id,
            "expected_arrival": (timezone.now() + timedelta(days=1)).isoformat()
        }
        response = self.client.post('/api/pre-registrations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue('qr_code' in response.data)
        self.assertTrue('token' in response.data)
        
    def test_scan_invite(self):
        # Create Invite manually
        pre = PreRegistration.objects.create(
            visitor_name="Scanner",
            visitor_email="scan@example.com",
            host=self.host,
            location=self.location,
            expected_arrival=timezone.now()
        )
        
        # Scan via API
        response = self.client.post('/api/pre-registrations/scan/', {'token': str(pre.token)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['visitor_email'], "scan@example.com")


class QRCodeServiceTests(BaseTestCase):
    def test_generate_qr(self):
        code = QRCodeService.generate_qr_code("hello world")
        self.assertTrue(code.startswith("data:image/png;base64,"))


class SecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # No authentication setup here

    def test_unauthenticated_access_blocked(self):
        response = self.client.get('/api/visitors/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ReturningVisitorTests(BaseTestCase):
    def test_search_visitor(self):
        # Create a visitor
        Visitor.objects.create(
            name="Returning User",
            email="return@example.com",
            phone="999888777",
            host=self.host,
            location=self.location,
            purpose="Visit"
        )
        
        # Search by email
        response = self.client.get('/api/visitors/search/?query=return@example.com')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Returning User")
        
        # Search by phone
        response = self.client.get('/api/visitors/search/?query=999888777')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Search not found
        response = self.client.get('/api/visitors/search/?query=invalid')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
