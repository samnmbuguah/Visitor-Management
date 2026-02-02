from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from io import StringIO
from .base import BaseTestCase
from ..models import Visitor

class OverstayTests(BaseTestCase):
    def test_overstay_detection(self):
        # Create a visitor who checked in 25 hours ago (overstay if default 24h)
        # Assuming expected_duration logic creates an expected_departure
        # If check_overstays relies on checkin_time + expected_duration
        
        # Visitor model setup
        # checkin_time = now - 25h
        # expected_duration = 24h (default?) or set explicitly
        
        overstay_visitor = Visitor.objects.create(
            name="Late Visitor",
            email="late@example.com",
            phone="111",
            host=self.host,
            location=self.location,
            purpose="Visit",
            checkin_time=timezone.now() - timedelta(hours=25),
            status="CHECKED_IN",
            expected_duration=1440
        )
        Visitor.objects.filter(id=overstay_visitor.id).update(checkin_time=timezone.now() - timedelta(hours=25))
        overstay_visitor.refresh_from_db()
        
        # Another visitor who is fine
        ok_visitor = Visitor.objects.create(
            name="Ok Visitor",
            email="ok@example.com",
            phone="222",
            host=self.host,
            location=self.location,
            purpose="Visit",
            checkin_time=timezone.now() - timedelta(hours=1),
            status="CHECKED_IN",
            expected_duration=1440
        )
        
        out = StringIO()
        call_command('check_overstays', stdout=out)
        output = out.getvalue()
        
        self.assertIn("Overstay detected: Late Visitor", output)
        self.assertNotIn("Overstay detected: Ok Visitor", output)
        self.assertIn("Found 1 overstays", output)
