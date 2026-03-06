from django.db import models
from django.contrib.auth import get_user_model
import uuid
from django.utils import timezone

User = get_user_model()


class Tenant(models.Model):
    """Multi-tenant organization/tenant model."""
    
    TIER_CHOICES = [
        ('STARTER', 'Starter'),
        ('PROFESSIONAL', 'Professional'),
        ('ENTERPRISE', 'Enterprise'),
        ('CUSTOM', 'Custom'),
    ]
    
    STATUS_CHOICES = [
        ('TRIAL', 'Trial'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    domain = models.CharField(max_length=200, blank=True, help_text="Custom domain for tenant")
    subdomain = models.CharField(max_length=100, unique=True)
    
    # Subscription details
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='TRIAL')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIAL')
    
    # Limits based on tier
    max_users = models.IntegerField(default=5)
    max_locations = models.IntegerField(default=1)
    max_visitors_per_month = models.IntegerField(default=100)
    
    # Billing
    billing_email = models.EmailField()
    billing_address = models.TextField(blank=True)
    
    # Trial period
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    subscription_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Owner/Primary admin
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='owned_tenants')
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.tier})"
    
    @property
    def is_trial_active(self):
        if self.trial_ends_at and timezone.now() < self.trial_ends_at:
            return True
        return False
    
    @property
    def is_subscription_active(self):
        if self.status == 'ACTIVE':
            if not self.subscription_ends_at or timezone.now() < self.subscription_ends_at:
                return True
        return False
    
    @property
    def can_add_users(self):
        current_users = User.objects.filter(profile__tenant=self).count()
        return current_users < self.max_users
    
    @property
    def can_add_locations(self):
        current_locations = self.locations.count()
        return current_locations < self.max_locations


class TenantUser(models.Model):
    """Link between User and Tenant with role."""
    
    ROLE_CHOICES = [
        ('OWNER', 'Owner'),
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Manager'),
        ('HOST', 'Host'),
        ('KIOSK', 'Kiosk'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_users')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    # Location restrictions for non-admin roles
    locations = models.ManyToManyField('Location', blank=True, related_name='tenant_users')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['tenant', 'user']
        ordering = ['tenant', 'role', 'user__username']
    
    def __str__(self):
        return f"{self.user.username} - {self.role} @ {self.tenant.name}"


class SubscriptionPlan(models.Model):
    """Available subscription plans."""
    
    BILLING_CYCLE_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('YEARLY', 'Yearly'),
    ]
    
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    tier = models.CharField(max_length=20, choices=Tenant.TIER_CHOICES)
    
    # Pricing
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Features/Limits
    max_users = models.IntegerField()
    max_locations = models.IntegerField()
    max_visitors_per_month = models.IntegerField()
    
    # Features flags
    has_api_access = models.BooleanField(default=False)
    has_custom_domain = models.BooleanField(default=False)
    has_sso = models.BooleanField(default=False)
    has_advanced_analytics = models.BooleanField(default=False)
    has_ocr_integration = models.BooleanField(default=False)
    has_gate_automation = models.BooleanField(default=False)
    
    # Description
    description = models.TextField()
    features = models.JSONField(default=list, help_text="List of features")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['tier', 'monthly_price']
    
    def __str__(self):
        return f"{self.name} (${self.monthly_price}/month)"


class Subscription(models.Model):
    """Active subscription for a tenant."""
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
        ('SUSPENDED', 'Suspended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Billing period
    billing_cycle = models.CharField(max_length=10, choices=SubscriptionPlan.BILLING_CYCLE_CHOICES, default='MONTHLY')
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    
    # Payment
    stripe_customer_id = models.CharField(max_length=200, blank=True)
    stripe_subscription_id = models.CharField(max_length=200, blank=True)
    
    # Usage tracking
    current_visitors_count = models.IntegerField(default=0)
    last_usage_reset = models.DateTimeField(default=timezone.now)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name}"
    
    @property
    def is_active(self):
        return self.status == 'ACTIVE' and timezone.now() < self.current_period_end
    
    def reset_usage(self):
        """Reset monthly usage counters."""
        self.current_visitors_count = 0
        self.last_usage_reset = timezone.now()
        self.save()
    
    def can_add_visitor(self):
        """Check if tenant can add more visitors this month."""
        return self.current_visitors_count < self.plan.max_visitors_per_month


class TenantSettings(models.Model):
    """Tenant-specific settings and configurations."""
    
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='settings')
    
    # Branding
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default='#10b981')
    secondary_color = models.CharField(max_length=7, default='#047857')
    
    # Security
    require_nda_for_all = models.BooleanField(default=False)
    session_timeout_minutes = models.IntegerField(default=480)  # 8 hours
    
    # Notifications
    email_notifications_enabled = models.BooleanField(default=True)
    sms_notifications_enabled = models.BooleanField(default=False)
    
    # Features
    enable_pre_registration = models.BooleanField(default=True)
    enable_walk_ins = models.BooleanField(default=True)
    enable_overstay_alerts = models.BooleanField(default=True)
    
    # Gate automation (if enabled)
    gate_automation_enabled = models.BooleanField(default=False)
    rtsp_camera_url = models.URLField(blank=True, help_text="RTSP camera URL for OCR")
    gate_api_endpoint = models.URLField(blank=True, help_text="Gate automation API endpoint")
    
    # Working hours
    working_hours_start = models.TimeField(default='09:00')
    working_hours_end = models.TimeField(default='18:00')
    working_days = models.JSONField(default=list, help_text="List of working days [0,1,2,3,4] for Mon-Fri")
    
    # Data retention
    visitor_data_retention_days = models.IntegerField(default=365)
    log_retention_days = models.IntegerField(default=90)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Tenant Settings"
    
    def __str__(self):
        return f"Settings for {self.tenant.name}"
