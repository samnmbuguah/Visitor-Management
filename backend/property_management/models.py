"""
Property Management Models

This module defines the core models for the property management system,
including maintenance requests, assets, vendors, and related entities.

Key Features:
- Multi-tenant support with tenant isolation
- Comprehensive maintenance request tracking
- Asset lifecycle management with QR codes
- Vendor management and insurance verification
- Cost center tracking for expense management
- Maintenance scheduling and work order management
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
from visitors.models import Tenant, Location, Host


class PriorityLevel(models.TextChoices):
    """Priority levels for maintenance requests and work orders.
    
    EMERGENCY: Immediate attention required (safety critical)
    HIGH: Urgent but not safety critical
    MEDIUM: Normal priority, routine maintenance
    LOW: Low priority, can be scheduled
    """
    EMERGENCY = 'EMERGENCY', 'Emergency'
    HIGH = 'HIGH', 'High'
    MEDIUM = 'MEDIUM', 'Medium'
    LOW = 'LOW', 'Low'


class MaintenanceStatus(models.TextChoices):
    """Status options for maintenance requests and schedules.
    
    REQUESTED: Initial request submitted, awaiting assignment
    ASSIGNED: Vendor assigned, work scheduled
    IN_PROGRESS: Work currently being performed
    COMPLETED: Work finished, awaiting review/payment
    CANCELLED: Request cancelled (duplicate, resolved, etc.)
    ON_HOLD: Work paused (waiting for parts, access, etc.)
    """
    REQUESTED = 'REQUESTED', 'Requested'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    ON_HOLD = 'ON_HOLD', 'On Hold'


class AssetStatus(models.TextChoices):
    """Status options for assets in the system.
    
    OPERATIONAL: Asset is functioning normally
    UNDER_MAINTENANCE: Asset being serviced or repaired
    OUT_OF_SERVICE: Asset not working, awaiting repair
    RETIRED: Asset decommissioned, no longer in use
    """
    OPERATIONAL = 'OPERATIONAL', 'Operational'
    UNDER_MAINTENANCE = 'UNDER_MAINTENANCE', 'Under Maintenance'
    OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'
    RETIRED = 'RETIRED', 'Retired'


class MaintenanceCategory(models.Model):
    """Categories for maintenance requests (HVAC, Electrical, Plumbing, etc.)
    
    Used to organize maintenance requests by type and assign appropriate vendors.
    Each category can have multiple vendors with expertise in that area.
    """
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='maintenance_categories', 
        null=True, 
        blank=True,
        help_text="Tenant this category belongs to (multi-tenant support)"
    )
    name = models.CharField(
        max_length=100,
        help_text="Category name (e.g., HVAC, Electrical, Plumbing)"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of what this category covers"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this category is currently active for new requests"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this category was created"
    )

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Maintenance Categories"


class Vendor(models.Model):
    """Approved contractors and service providers.
    
    Vendors are external service providers who can be assigned to maintenance requests.
    They can have multiple specialties and are tracked for insurance verification
    and performance metrics.
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='vendors', null=True, blank=True)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    company = models.CharField(max_length=200, blank=True)
    specialties = models.ManyToManyField(MaintenanceCategory, related_name='vendors')
    is_active = models.BooleanField(default=True)
    insurance_verified = models.BooleanField(default=False)
    insurance_expiry = models.DateField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.company}"

    class Meta:
        ordering = ['name']


class MaintenanceRequest(models.Model):
    """Repair requests submitted by hosts"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='maintenance_requests', null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='maintenance_requests')
    host = models.ForeignKey(Host, on_delete=models.CASCADE, related_name='maintenance_requests', null=True, blank=True)
    category = models.ForeignKey(MaintenanceCategory, on_delete=models.SET_NULL, null=True, related_name='requests')
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PriorityLevel.choices, default=PriorityLevel.MEDIUM)
    status = models.CharField(max_length=20, choices=MaintenanceStatus.choices, default=MaintenanceStatus.REQUESTED)
    requested_at = models.DateTimeField(auto_now_add=True)
    assigned_to = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_requests')
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Internal notes for maintenance staff")
    host_visible_notes = models.TextField(blank=True, help_text="Notes visible to the requesting host")
    
    def __str__(self):
        return f"{self.title} - {self.location.name}"

    class Meta:
        ordering = ['-requested_at']


class MaintenancePhoto(models.Model):
    """Photos of maintenance issues and repairs"""
    maintenance_request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name='photos')
    photo = models.TextField(help_text="Base64 encoded image")
    caption = models.CharField(max_length=200, blank=True)
    is_before_photo = models.BooleanField(default=True, help_text="True for issue photo, False for repair completion photo")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Photo for {self.maintenance_request.title}"


class WorkOrder(models.Model):
    """Detailed work orders for assigned maintenance tasks"""
    maintenance_request = models.OneToOneField(MaintenanceRequest, on_delete=models.CASCADE, related_name='work_order')
    work_order_number = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='work_orders')
    assigned_technician = models.CharField(max_length=100, blank=True)
    instructions = models.TextField()
    estimated_duration_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    material_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.labor_cost and self.material_cost:
            self.total_cost = self.labor_cost + self.material_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"WO-{self.work_order_number}"


class AssetType(models.Model):
    """Types of assets (HVAC, Elevator, Security System, etc.)"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='asset_types', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    requires_maintenance = models.BooleanField(default=True)
    maintenance_interval_days = models.IntegerField(null=True, blank=True, help_text="Days between routine maintenance")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Asset(models.Model):
    """Individual property assets"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='assets', null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='assets')
    asset_type = models.ForeignKey(AssetType, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    serial_number = models.CharField(max_length=100, blank=True, unique=True)
    qr_code = models.CharField(max_length=200, blank=True, unique=True, help_text="QR code value for scanning")
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    expected_lifespan_years = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AssetStatus.choices, default=AssetStatus.OPERATIONAL)
    location_detail = models.CharField(max_length=200, blank=True, help_text="Specific location within the building")
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    installed_date = models.DateField(null=True, blank=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.location.name}"

    class Meta:
        ordering = ['location', 'name']


class MaintenanceSchedule(models.Model):
    """Preventive maintenance schedules for assets"""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_schedules')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    scheduled_date = models.DateTimeField()
    estimated_duration_hours = models.DecimalField(max_digits=5, decimal_places=2)
    assigned_to = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='scheduled_maintenance')
    status = models.CharField(max_length=20, choices=MaintenanceStatus.choices, default=MaintenanceStatus.REQUESTED)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.asset.name}"

    class Meta:
        ordering = ['scheduled_date']


class AssetCheckout(models.Model):
    """Tool and equipment lending tracking"""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='checkouts')
    checked_out_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asset_checkouts')
    checked_out_at = models.DateTimeField(auto_now_add=True)
    expected_return_at = models.DateTimeField()
    actual_return_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    condition_checkout = models.TextField(help_text="Condition description when checked out")
    condition_return = models.TextField(blank=True, help_text="Condition description when returned")

    def __str__(self):
        return f"{self.asset.name} - {self.checked_out_by.username}"

    class Meta:
        ordering = ['-checked_out_at']


class CostCenter(models.Model):
    """Cost centers for expense tracking"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cost_centers', null=True, blank=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    budget_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    current_spend = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manager = models.ForeignKey(Host, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_cost_centers')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['code']


class MaintenanceExpense(models.Model):
    """Track costs associated with maintenance requests"""
    maintenance_request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name='expenses')
    cost_center = models.ForeignKey(CostCenter, on_delete=models.CASCADE, related_name='maintenance_expenses')
    expense_type = models.CharField(max_length=50, choices=[
        ('LABOR', 'Labor'),
        ('MATERIALS', 'Materials'),
        ('EQUIPMENT', 'Equipment Rental'),
        ('OTHER', 'Other'),
    ])
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    invoice_number = models.CharField(max_length=100, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.expense_type}: {self.amount} for {self.maintenance_request.title}"

    class Meta:
        ordering = ['-created_at']
