from django.core.management.base import BaseCommand
from django.utils import timezone
from visitors.models import Visitor
from visitors.services.notifications import NotificationService
from datetime import timedelta

class Command(BaseCommand):
    help = 'Checks for visitors who have overstayed their expected duration'

    def handle(self, *args, **options):
        now = timezone.now()
        # Find visitors who are CHECKED_IN
        # And (check_in_time + expected_duration) < now
        # And NOT already marked as OVERSTAY (status is still CHECKED_IN)
        
        # Note: expected_duration is an integer (minutes) in the model?
        # Let's check model definition. Assuming it's minutes or DurationField.
        # Visitor model: expected_duration = models.DurationField
        
        active_visitors = Visitor.objects.filter(status='CHECKED_IN')
        count = 0
        
        for visitor in active_visitors:
             if not visitor.checkin_time:
                 continue
                 
             # default duration if none? 
             duration_val = visitor.expected_duration or 1440 # Default 24h in minutes
             duration = timedelta(minutes=duration_val) if isinstance(duration_val, int) else duration_val
             
             expected_departure = visitor.checkin_time + duration
             
             if now > expected_departure:
                 # It's an overstay!
                 self.stdout.write(self.style.WARNING(f"Overstay detected: {visitor.name} at {visitor.location}"))
                 
                 # Send alert
                 try:
                     NotificationService.send_email(
                         to_email=visitor.host.email, # Notify host
                         subject="Visitor Overstay Alert",
                         context={'visitor': visitor, 'expected_departure': expected_departure},
                         template_code='OVERSTAY_ALERT' # We need to create this template or just hardcode for now
                     )
                     # Also notify Admin?
                     
                     # Optionally update status to OVERSTAYED?
                     # visitor.status = 'OVERSTAYED'
                     # visitor.save()
                     
                 except Exception as e:
                     self.stdout.write(self.style.ERROR(f"Failed to notify: {e}"))
                 
                 count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully checked visitors. Found {count} overstays.'))
