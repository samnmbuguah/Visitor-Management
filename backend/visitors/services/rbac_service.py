from typing import List, Optional
from django.contrib.auth.models import User
from ..models import Visitor, Host, Location


class RBACService:
    """Service for Role-Based Access Control following SRP."""
    
    @staticmethod
    def can_user_approve_visitor(user: User, visitor: Visitor) -> tuple[bool, str]:
        """
        Check if user can approve a visitor.
        Returns (can_approve, reason_if_not)
        """
        profile = getattr(user, 'profile', None)
        
        if not profile:
            return False, "Permission denied: No user profile"
        
        if profile.role == 'SUPER_ADMIN':
            return True, ""
        
        if profile.role == 'ADMIN':
            if visitor.location != profile.location:
                return False, "Cannot approve visitor outside your location"
            return True, ""
        
        if profile.role == 'HOST':
            user_host_profile = getattr(user, 'host_profile', None)
            if not user_host_profile:
                return False, "No host profile found"
            
            if visitor.host != user_host_profile:
                return False, "Cannot approve visitor assigned to another host"
            return True, ""
        
        return False, "Permission denied: Invalid role"
    
    @staticmethod
    def filter_visitors_by_role(user: User, base_queryset) -> List[Visitor]:
        """Filter visitors based on user role following OCP."""
        if not user.is_authenticated:
            return list(base_queryset.filter(status='CHECKED_IN'))
        
        if user.is_staff:
            return list(base_queryset)
        
        profile = getattr(user, 'profile', None)
        if not profile:
            return []
        
        if profile.role == 'SUPER_ADMIN':
            return list(base_queryset)
        
        if profile.role == 'ADMIN':
            return list(base_queryset.filter(location=profile.location))
        
        if profile.role == 'HOST':
            user_host_profile = getattr(user, 'host_profile', None)
            if user_host_profile:
                return list(base_queryset.filter(host=user_host_profile))
            return []
        
        return []
    
    @staticmethod
    def can_user_access_location(user: User, location: Location) -> bool:
        """Check if user can access a specific location."""
        if not user.is_authenticated:
            return False
        
        profile = getattr(user, 'profile', None)
        if not profile:
            return False
        
        if profile.role == 'SUPER_ADMIN':
            return True
        
        if profile.role in ['ADMIN', 'HOST']:
            return profile.location == location
        
        return False
