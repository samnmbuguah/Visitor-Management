from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from visitors.models import Visitor, Host, Location

class AIAgentEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='staffuser', password='password123')
        self.location = Location.objects.create(name='HQ Tower')
        self.host = Host.objects.create(name='David Host', email='david@corp.com', department='Engineering', location=self.location)

    @patch('visitors.views.ai_views.run_kiosk_agent')
    def test_kiosk_chat_endpoint_success(self, mock_run_agent):
        mock_run_agent.return_value = {
            "success": True,
            "session_id": "test-session",
            "reply": "Hello! How can I assist you with check-in today?",
            "tool_calls": []
        }

        url = reverse('ai_kiosk_chat')
        response = self.client.post(url, {
            "session_id": "test-session",
            "message": "Hello"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        self.assertIn("Hello", response.data.get('reply'))

    def test_kiosk_chat_missing_message(self):
        url = reverse('ai_kiosk_chat')
        response = self.client.post(url, {"session_id": "test-session"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('visitors.views.ai_views.extract_visitor_card_info')
    def test_scan_card_endpoint(self, mock_extract):
        mock_extract.return_value = {
            "success": True,
            "data": {
                "name": "Jane Doe",
                "company": "Tech Corp",
                "email": "jane@techcorp.com",
                "phone": "+1234567890",
                "id_number": "D1234567"
            }
        }

        url = reverse('ai_scan_card')
        response = self.client.post(url, {
            "image": "data:image/jpeg;base64,samplebase64string"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], 'Jane Doe')

    @patch('visitors.views.ai_views.identify_visitor_by_face')
    def test_face_verification_endpoint(self, mock_face):
        mock_face.return_value = {
            "matched": True,
            "confidence": 0.98,
            "visitor": {
                "id": 1,
                "name": "Returning Guest",
                "email": "guest@company.com"
            }
        }

        url = reverse('ai_face_verify')
        response = self.client.post(url, {
            "image": "data:image/jpeg;base64,samplephoto"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('matched'))
        self.assertEqual(response.data['visitor']['name'], 'Returning Guest')

    def test_visitor_briefing_endpoint(self):
        visitor = Visitor.objects.create(
            name="Alice Smith",
            email="alice@partner.com",
            phone="1234567890",
            company="Partner Inc",
            host=self.host,
            location=self.location,
            purpose="Strategy Session",
            ai_briefing="Alice Smith from Partner Inc has arrived for Strategy Session. NDA is on file."
        )

        self.client.force_authenticate(user=self.user)
        url = reverse('ai_visitor_briefing')
        response = self.client.post(url, {"visitor_id": visitor.id}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Alice Smith", response.data['briefing'])
