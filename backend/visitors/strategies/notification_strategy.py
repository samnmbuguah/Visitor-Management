from abc import ABC, abstractmethod
from typing import Dict, Any
from ..models import Visitor


class NotificationStrategy(ABC):
    """Abstract notification strategy following Strategy Pattern."""
    
    @abstractmethod
    def send(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send notification to recipient."""
        pass


class EmailNotificationStrategy(NotificationStrategy):
    """Email notification strategy."""
    
    def send(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send email notification."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        try:
            send_mail(
                subject=context.get('subject', 'Visitor Notification'),
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Failed to send email to {recipient}: {e}")
            return False


class SMSNotificationStrategy(NotificationStrategy):
    """SMS notification strategy."""
    
    def send(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send SMS notification."""
        # TODO: Integrate with SMS service like Twilio
        print(f"SMS to {recipient}: {message}")
        return True


class WhatsAppNotificationStrategy(NotificationStrategy):
    """WhatsApp notification strategy."""
    
    def send(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send WhatsApp notification."""
        # TODO: Integrate with WhatsApp Business API
        print(f"WhatsApp to {recipient}: {message}")
        return True


class NotificationContext:
    """Context for notification strategies following Strategy Pattern."""
    
    def __init__(self, strategy: NotificationStrategy):
        self._strategy = strategy
    
    def set_strategy(self, strategy: NotificationStrategy):
        """Change notification strategy."""
        self._strategy = strategy
    
    def send_notification(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send notification using current strategy."""
        return self._strategy.send(recipient, message, context)


class NotificationFactory:
    """Factory for creating notification strategies."""
    
    @staticmethod
    def create_strategy(strategy_type: str) -> NotificationStrategy:
        """Create notification strategy based on type."""
        strategies = {
            'email': EmailNotificationStrategy(),
            'sms': SMSNotificationStrategy(),
            'whatsapp': WhatsAppNotificationStrategy(),
        }
        
        strategy = strategies.get(strategy_type.lower())
        if not strategy:
            raise ValueError(f"Unknown notification strategy: {strategy_type}")
        
        return strategy
