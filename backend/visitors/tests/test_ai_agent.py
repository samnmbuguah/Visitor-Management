from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

class AIAgentEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

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
