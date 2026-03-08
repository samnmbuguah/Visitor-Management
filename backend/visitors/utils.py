from .models import Host, UserProfile
from .tenant_models import Tenant, TenantUser

def get_user_tenant(user):
    """
    Utility to reliably extract the tenant for a given user.
    Checks TenantUser membership first, then UserProfile/Host fallbacks.
    """
    if not user or not user.is_authenticated:
        return None
        
    # 1. Check TenantUser membership (Preferred for multi-tenant)
    tenant_user = TenantUser.objects.filter(user=user).first()
    if tenant_user:
        return tenant_user.tenant
        
    # 2. Check Host profile
    try:
        if hasattr(user, 'host_profile') and user.host_profile.tenant:
            return user.host_profile.tenant
    except:
        pass
        
    # 3. Check UserProfile location's tenant
    try:
        profile = getattr(user, 'profile', None)
        if profile and profile.location and profile.location.tenant:
            return profile.location.tenant
    except:
        pass
        
    return None
