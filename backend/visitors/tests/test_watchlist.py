from rest_framework import status
from ..models import WatchlistEntry, Visitor
from .base import BaseTestCase

class WatchlistTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.blocked_email = "bad@actor.com"
        self.blocked_name = "Bad Actor"
        
        # Create Watchlist Entry
        WatchlistEntry.objects.create(
            name=self.blocked_name,
            email=self.blocked_email,
            reason="Security Risk",
            match_type="EXACT"
        )

    def test_visitor_blocked_by_email(self):
        data = {
            "name": "Another Name",
            "email": self.blocked_email, # Match
            "phone": "555555",
            "host": self.host.id,
            "purpose": "Hacking",
            "location": self.location.id
        }
        
        # Should be allowed creation but with REJECTED status
        # OR logic might block creation entirely? 
        # API returns 201 created, but status=REJECTED.
        
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'REJECTED')
        
    def test_visitor_blocked_by_name(self):
        data = {
            "name": "Bad Actor", # Match
            "email": "innocent@example.com",
            "phone": "555555",
            "host": self.host.id,
            "purpose": "Visit",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'REJECTED')

    def test_visitor_allowed_if_no_match(self):
        data = {
            "name": "Good Visitor",
            "email": "good@example.com",
            "phone": "999999",
            "host": self.host.id,
            "purpose": "Visit",
            "location": self.location.id
        }
        response = self.client.post('/api/visitors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'CHECKED_IN')
