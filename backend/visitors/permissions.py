from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to super admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                    hasattr(request.user, 'profile') and 
                    request.user.profile.role == 'SUPER_ADMIN')

class IsLocationAdmin(permissions.BasePermission):
    """
    Allows access to Location Admins (and Super Admins).
    Checks if user is assigned to the requested location (if applicable).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False

        if profile.role == 'SUPER_ADMIN':
            return True
            
        return profile.role == 'ADMIN'

class IsHost(permissions.BasePermission):
    """
    Allows access to Hosts.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False
            
        return True # Basic check, specific object permission handled in has_object_permission

    def has_object_permission(self, request, view, obj):
        profile = request.user.profile
        if profile.role == 'SUPER_ADMIN':
            return True
            
        # If object has a location attribute, check if user belongs to that location
        if hasattr(obj, 'location'):
            if obj.location != profile.location:
                return False
                
        # If object is a Visitor/PreRegistration, check ownership if user is just a HOST
        if profile.role == 'HOST':
            if hasattr(obj, 'host') and hasattr(obj.host, 'user'):
                return obj.host.user == request.user
                
        return True
