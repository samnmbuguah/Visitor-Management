from abc import ABC, abstractmethod
from typing import Dict, Any, List


class INotificationSender(ABC):
    """Interface for notification senders following ISP."""
    
    @abstractmethod
    def send(self, recipient: str, message: str, context: Dict[str, Any] = None) -> bool:
        """Send notification to recipient."""
        pass


class ITemplateRenderer(ABC):
    """Interface for template rendering following ISP."""
    
    @abstractmethod
    def render(self, template: str, context: Dict[str, Any]) -> str:
        """Render template with context."""
        pass


class IVisitorRepository(ABC):
    """Interface for visitor repository following ISP."""
    
    @abstractmethod
    def get_by_id(self, id: int):
        """Get visitor by ID."""
        pass
    
    @abstractmethod
    def get_active_visitors(self):
        """Get active visitors."""
        pass


class IRBACService(ABC):
    """Interface for RBAC service following ISP."""
    
    @abstractmethod
    def can_user_approve_visitor(self, user, visitor) -> tuple[bool, str]:
        """Check if user can approve visitor."""
        pass
    
    @abstractmethod
    def filter_visitors_by_role(self, user, base_queryset) -> List:
        """Filter visitors by user role."""
        pass


class IOverdueChecker(ABC):
    """Interface for overdue checking following ISP."""
    
    @abstractmethod
    def check_overdue_visitors(self, grace_minutes: int = 15) -> List:
        """Check for overdue visitors."""
        pass
    
    @abstractmethod
    def send_overdue_notifications(self, overdue_visitors: List) -> None:
        """Send notifications for overdue visitors."""
        pass
