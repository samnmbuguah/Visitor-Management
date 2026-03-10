from rest_framework import viewsets, permissions
from ..models import Tenant
from ..serializers import TenantSerializer
from ..utils import get_user_tenant
from ..permissions import IsAdminUser

class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tenants."""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['list', 'create', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        # In a real multi-tenant app, superadmins see all, 
        # but regular admins might only see their own tenant?
        # For now, let's allow authenticated users to list tenants they belong to
        # or if they are superuser, all tenants.
        if self.request.user.is_superuser:
            return Tenant.objects.all()
        
        # If user has a tenant, only show that one
        tenant = get_user_tenant(self.request.user)
        if tenant:
            return Tenant.objects.filter(id=tenant.id)
            
        return Tenant.objects.none()
