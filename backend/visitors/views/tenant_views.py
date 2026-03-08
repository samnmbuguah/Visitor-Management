from rest_framework import viewsets, permissions
from ..models import Tenant
from ..serializers import TenantSerializer

class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tenants."""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # In a real multi-tenant app, superadmins see all, 
        # but regular admins might only see their own tenant?
        # For now, let's allow authenticated users to list tenants they belong to
        # or if they are superuser, all tenants.
        if self.request.user.is_superuser:
            return Tenant.objects.all()
        
        # If user has a profile with a tenant, only show that one
        if hasattr(self.request.user, 'profile') and self.request.user.profile.tenant:
            return Tenant.objects.filter(id=self.request.user.profile.tenant.id)
            
        return Tenant.objects.none()
