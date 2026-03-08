from typing import List, Optional, Dict, Any
from django.utils import timezone
from ..models import Visitor
from ..repositories.visitor_repository import VisitorRepository
from ..services.notifications import NotificationService
from ..services.rbac_service import RBACService


class VisitorService:
    """Service for Visitor business logic following SRP."""
    
    def __init__(self, repository: VisitorRepository = None):
        self.repository = repository or VisitorRepository()
        self.rbac_service = RBACService()
        self.notification_service = NotificationService()
    
    def get_visitor_by_id(self, id: int) -> Optional[Visitor]:
        """Get visitor by ID."""
        return self.repository.get_by_id(id)
    
    def get_visitors(self, user, filters: Dict[str, Any] = None) -> List[Visitor]:
        """Get visitors filtered by user role and provided filters."""
        base_queryset = Visitor.objects.all().order_by('-checkin_time')
        
        # Apply RBAC filtering
        filtered_visitors = self.rbac_service.filter_visitors_by_role(user, base_queryset)
        
        # Apply additional filters
        if filters:
            if 'status' in filters:
                filtered_visitors = [v for v in filtered_visitors if v.status == filters['status']]
            if 'search' in filters:
                search_term = filters['search'].lower()
                filtered_visitors = [
                    v for v in filtered_visitors 
                    if (search_term in v.email.lower() or 
                        search_term in v.phone.lower() or 
                        search_term in v.name.lower())
                ]
        
        return filtered_visitors
    
    def create_visitor(self, data: Dict[str, Any]) -> Visitor:
        """Create a new visitor with business logic."""
        # Apply business rules
        if 'status' not in data:
            data['status'] = 'PENDING'  # Default to pending approval
        
        visitor = self.repository.create(data)
        
        # Send notifications if needed
        if visitor.host and visitor.status == 'CHECKED_IN':
            try:
                self.notification_service.notify_host_of_arrival(visitor)
            except Exception as e:
                # Log error but don't fail the creation
                print(f"Failed to notify host: {e}")
        
        return visitor
    
    def approve_visitor(self, user, visitor_id: int) -> tuple[Optional[Visitor], str]:
        """Approve a visitor with RBAC checks."""
        visitor = self.repository.get_by_id(visitor_id)
        if not visitor:
            return None, "Visitor not found"
        
        if visitor.status != 'PENDING':
            return None, "Visitor is not pending approval"
        
        # Check RBAC
        can_approve, reason = self.rbac_service.can_user_approve_visitor(user, visitor)
        if not can_approve:
            return None, reason
        
        # Update visitor status
        visitor = self.repository.update(visitor_id, {'status': 'CHECKED_IN'})
        
        # Send notifications
        try:
            if visitor.host:
                self.notification_service.notify_host_of_arrival(visitor)
        except Exception as e:
            print(f"Failed to notify host: {e}")
        
        return visitor, ""
    
    def reject_visitor(self, user, visitor_id: int) -> tuple[Optional[Visitor], str]:
        """Reject a visitor with RBAC checks."""
        visitor = self.repository.get_by_id(visitor_id)
        if not visitor:
            return None, "Visitor not found"
        
        if visitor.status != 'PENDING':
            return None, "Visitor is not pending approval"
        
        # Check RBAC
        can_approve, reason = self.rbac_service.can_user_approve_visitor(user, visitor)
        if not can_approve:
            return None, reason
        
        # Update visitor status
        visitor = self.repository.update(visitor_id, {'status': 'REJECTED'})
        
        return visitor, ""
    
    def checkout_visitor(self, visitor_id: int) -> tuple[Optional[Visitor], str]:
        """Check out a visitor."""
        visitor = self.repository.get_by_id(visitor_id)
        if not visitor:
            return None, "Visitor not found"
        
        if visitor.status != 'CHECKED_IN':
            return None, "Visitor is not checked in"
        
        # Update visitor status and checkout time
        visitor = self.repository.update(visitor_id, {
            'status': 'CHECKED_OUT',
            'checkout_time': timezone.now()
        })
        
        return visitor, ""
    
    def get_active_visitors(self, user) -> List[Visitor]:
        """Get active visitors filtered by user role."""
        active_visitors = self.repository.get_active_visitors()
        return self.rbac_service.filter_visitors_by_role(user, active_visitors)
    
    def get_today_visitors(self, user) -> List[Visitor]:
        """Get today's visitors filtered by user role."""
        today_visitors = self.repository.get_today_visitors()
        return self.rbac_service.filter_visitors_by_role(user, today_visitors)
    
    def search_visitors(self, user, query: str) -> List[Visitor]:
        """Search visitors by name, email, or phone."""
        if len(query) < 3:
            return []
        
        filters = {'search': query}
        return self.get_visitors(user, filters)
