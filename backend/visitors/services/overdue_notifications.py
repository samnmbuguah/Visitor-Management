from datetime import datetime, timedelta
from django.utils import timezone
from ..models import Visitor

class OverdueNotificationService:
    """Service for handling overdue visitor notifications."""
    
    @staticmethod
    def check_overdue_visitors():
        """Check for visitors who have exceeded their expected duration."""
        now = timezone.now()
        overdue_visitors = []
        
        # Get all checked-in visitors with expected duration
        visitors = Visitor.objects.filter(
            status='CHECKED_IN',
            expected_duration__isnull=False
        ).select_related('host', 'location')
        
        for visitor in visitors:
            # Calculate when the visitor should have checked out
            expected_checkout_time = visitor.checkin_time + timedelta(minutes=visitor.expected_duration)
            
            # Check if visitor is overdue (15 minutes grace period)
            if now > expected_checkout_time + timedelta(minutes=15):
                overdue_minutes = int((now - expected_checkout_time).total_seconds() / 60)
                
                overdue_visitors.append({
                    'visitor': visitor,
                    'overdue_minutes': overdue_minutes,
                    'expected_checkout': expected_checkout_time,
                    'grace_period_end': expected_checkout_time + timedelta(minutes=15)
                })
        
        return overdue_visitors
    
    @staticmethod
    def send_overdue_notifications(overdue_visitors):
        """Send notifications for overdue visitors."""
        for overdue_info in overdue_visitors:
            visitor = overdue_info['visitor']
            overdue_minutes = overdue_info['overdue_minutes']
            
            # Prepare notification message
            message = f"""
            OVERDUE VISITOR ALERT
            
            Visitor: {visitor.name}
            Email: {visitor.email}
            Phone: {visitor.phone}
            Company: {visitor.company}
            Host: {visitor.host.name if visitor.host else 'N/A'}
            Location: {visitor.location.name if visitor.location else 'N/A'}
            
            Expected checkout: {overdue_info['expected_checkout'].strftime('%Y-%m-%d %H:%M')}
            Overdue by: {overdue_minutes} minutes
            
            Please ensure the visitor checks out properly or contact them.
            """.strip()
            
            # Log the notification (in a real implementation, this would send SMS/WhatsApp)
            print(f"OVERDUE NOTIFICATION: {message}")
            
            # TODO: Integrate with SMS/WhatsApp service
            # OverdueNotificationService.send_sms(visitor.phone, message)
            # OverdueNotificationService.send_whatsapp(visitor.phone, message)
    
    @staticmethod
    def send_sms(phone_number, message):
        """Send SMS notification (placeholder implementation)."""
        # TODO: Integrate with SMS service like Twilio, AWS SNS, etc.
        print(f"SMS to {phone_number}: {message}")
        return True
    
    @staticmethod
    def send_whatsapp(phone_number, message):
        """Send WhatsApp notification (placeholder implementation)."""
        # TODO: Integrate with WhatsApp Business API
        print(f"WhatsApp to {phone_number}: {message}")
        return True
