from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
from .tenant_models import Tenant, TenantUser


class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    ADMIN = 'ADMIN', 'Admin'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    HOST = 'HOST', 'Host'
    MANAGER = 'MANAGER', 'Manager'
    SECURITY = 'SECURITY', 'Security'


class Location(models.Model):
    """Physical location/office where visitors are managed."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='locations', null=True, blank=True)
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    floor = models.CharField(max_length=50, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    is_active = models.BooleanField(default=True)
    require_visitor_approval = models.BooleanField(default=False)
    require_nda = models.BooleanField(default=False)
    nda_content = models.TextField(blank=True, default="By signing this, you agree to the Non-Disclosure Agreement.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}" + (f" - {self.floor}" if self.floor else "")

    class Meta:
        ordering = ['name']


class VisitorType(models.Model):
    """Predefined visitor types for common visit reasons."""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Kiosk(models.Model):
    """Represents a check-in kiosk at a location."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='kiosks', null=True, blank=True)
    name = models.CharField(max_length=100)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='kiosks')
    is_active = models.BooleanField(default=True)
    last_active = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} @ {self.location.name}"

    class Meta:
        ordering = ['location', 'name']


class UserProfile(models.Model):
    """Extended user profile with roles and location assignment."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.HOST)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN


class Host(models.Model):
    """Employee who can receive visitors."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='hosts', null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='hosts')
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='host_profile')
    is_active = models.BooleanField(default=True)
    receive_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']



class PreRegistration(models.Model):
    """Pre-registered visitor invite."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('USED', 'Used'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='pre_registrations', null=True, blank=True)
    visitor_name = models.CharField(max_length=100)
    visitor_email = models.EmailField()
    visitor_phone = models.CharField(max_length=15, blank=True)
    visitor_company = models.CharField(max_length=100, blank=True)
    visitor_number_plate = models.CharField(max_length=20, blank=True, help_text="Vehicle number plate")
    visitor_type = models.ForeignKey(VisitorType, on_delete=models.SET_NULL, null=True, blank=True, related_name='invites')
    purpose = models.TextField(blank=True)  # Now optional, used for additional details
    host = models.ForeignKey(Host, on_delete=models.CASCADE, related_name='invites')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='invites')
    expected_arrival = models.DateTimeField()
    expected_duration = models.IntegerField(null=True, blank=True, help_text="Expected visit duration in minutes")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invite for {self.visitor_name} ({self.status})"

    class Meta:
        ordering = ['-expected_arrival']


class Visitor(models.Model):

    """A person visiting the premises."""
    STATUS_CHOICES = [
        ('CHECKED_IN', 'Checked In'),
        ('CHECKED_OUT', 'Checked Out'),
        ('PENDING', 'Pending Approval'),
        ('REJECTED', 'Rejected'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='visitors', null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    company = models.CharField(max_length=100, blank=True)
    number_plate = models.CharField(max_length=20, blank=True, help_text="Vehicle number plate")
    host = models.ForeignKey(Host, on_delete=models.SET_NULL, null=True, related_name='visitors')
    visitor_type = models.ForeignKey(VisitorType, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitors')
    purpose = models.TextField(blank=True)  # Now optional, used for additional details
    photo = models.TextField(blank=True, help_text="Base64 encoded image")
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitors')
    kiosk = models.ForeignKey(Kiosk, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitors')
    checkin_time = models.DateTimeField(auto_now_add=True)
    checkout_time = models.DateTimeField(null=True, blank=True)
    expected_duration = models.IntegerField(null=True, blank=True, help_text="Expected visit duration in minutes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CHECKED_IN')
    badge_number = models.CharField(max_length=20, blank=True)
    pre_registration = models.OneToOneField(PreRegistration, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitor_record')
    nda_accepted = models.BooleanField(default=False)
    signature = models.TextField(blank=True, help_text="Base64 encoded signature")
    nda_signed_at = models.DateTimeField(null=True, blank=True)
    
    # Audit trail for approvals
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_visitors')
    approved_at = models.DateTimeField(null=True, blank=True)


    def __str__(self):
        return f"{self.name} - {self.checkin_time.date()}"

    class Meta:
        ordering = ['-checkin_time']


class NotificationTemplate(models.Model):
    """Email/SMS notification templates."""
    TYPES = [
        ('VISITOR_ARRIVAL', 'Visitor Arrival'),
        ('VISITOR_CHECKOUT', 'Visitor Checkout'),
        ('PRE_REGISTRATION', 'Pre-Registration Invite'),
        ('OVERSTAY_ALERT', 'Overstay Alert'),
        ('VISITOR_CONFIRMATION', 'Visitor Confirmation'),
    ]

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=30, choices=TYPES)
    subject = models.CharField(max_length=200)
    body = models.TextField(help_text="Supports variables: {{visitor_name}}, {{host_name}}, {{checkin_time}}, etc.")
    is_active = models.BooleanField(default=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, null=True, blank=True, related_name='notification_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    class Meta:
        ordering = ['type', 'name']


class EmailNotificationLog(models.Model):
    """Log of sent email notifications."""
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
    ]

    template = models.ForeignKey(NotificationTemplate, on_delete=models.SET_NULL, null=True, related_name='email_logs')
    recipient_email = models.EmailField()
    recipient_phone = models.CharField(max_length=15, blank=True)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    visitor = models.ForeignKey(Visitor, on_delete=models.SET_NULL, null=True, blank=True, related_name='email_notifications')
    host = models.ForeignKey(Host, on_delete=models.SET_NULL, null=True, blank=True, related_name='email_notifications')

    def __str__(self):
        return f"{self.subject} to {self.recipient_email} ({self.status})"

    class Meta:
        ordering = ['-sent_at']


class WatchlistEntry(models.Model):
    MATCH_TYPES = [
        ('EXACT', 'Exact Match'),
        ('CONTAINS', 'Contains (Fuzzy)'),
    ]
    
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    match_type = models.CharField(max_length=10, choices=MATCH_TYPES, default='EXACT')
    reason = models.TextField()
    is_active = models.BooleanField(default=True)
    
    location = models.ForeignKey(Location, on_delete=models.CASCADE, null=True, blank=True, related_name='watchlist')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Watchlist: {self.email or self.name}"

class Parcel(models.Model):
    """Represents an incoming parcel/delivery."""
    STATUS_CHOICES = [
        ('RECEIVED', 'Received'),
        ('NOTIFIED', 'Notified'),
        ('COLLECTED', 'Collected'),
    ]

    recipient = models.ForeignKey(Host, on_delete=models.CASCADE, related_name='parcels')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='parcels', null=True)
    courier = models.CharField(max_length=100)
    tracking_number = models.CharField(max_length=100, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    photo = models.TextField(blank=True, help_text="Base64 encoded image of the parcel")
    signature_required = models.BooleanField(default=False)
    collected_at = models.DateTimeField(null=True, blank=True)
    collection_signature = models.TextField(blank=True, help_text="Base64 encoded signature")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Parcel for {self.recipient.name} ({self.status})"

    class Meta:
        ordering = ['-received_at']


# Import security models
try:
    from .security_models import (
        GateAccessLog, SecurityIncident, SecurityAlert,
        CameraStatus, VisitorTracking
    )
except ImportError:
    # Security models not yet available
    pass

# Import notification models
try:
    from .notification_models import (
        DeviceToken, NotificationLog, NotificationPreference
    )
except ImportError:
    # Notification models not yet available
    pass

# Import payment models
try:
    from .payment_models import (
        Customer, StripeSubscription, Invoice, PaymentMethod, Transaction
    )
except ImportError:
    # Payment models not yet available
    pass
