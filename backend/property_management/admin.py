from django.contrib import admin
from .models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, MaintenancePhoto, WorkOrder,
    AssetType, Asset, MaintenanceSchedule, AssetCheckout, CostCenter, MaintenanceExpense
)


@admin.register(MaintenanceCategory)
class MaintenanceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_active', 'created_at']
    list_filter = ['tenant', 'is_active', 'created_at']
    search_fields = ['name', 'description']


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'contact_person', 'phone', 'rating', 'is_active', 'insurance_verified']
    list_filter = ['tenant', 'is_active', 'insurance_verified', 'specialties']
    search_fields = ['name', 'company', 'contact_person', 'email']
    filter_horizontal = ['specialties']


class MaintenancePhotoInline(admin.TabularInline):
    model = MaintenancePhoto
    extra = 1


class MaintenanceExpenseInline(admin.TabularInline):
    model = MaintenanceExpense
    extra = 1


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'location', 'host', 'category', 'priority', 'status', 'requested_at']
    list_filter = ['location', 'category', 'priority', 'status', 'requested_at']
    search_fields = ['title', 'description']
    inlines = [MaintenancePhotoInline, MaintenanceExpenseInline]
    date_hierarchy = 'requested_at'


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ['work_order_number', 'maintenance_request', 'vendor', 'total_cost', 'created_at']
    list_filter = ['vendor', 'created_at']
    search_fields = ['work_order_number', 'instructions', 'assigned_technician']


@admin.register(AssetType)
class AssetTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'requires_maintenance', 'maintenance_interval_days', 'is_active']
    list_filter = ['tenant', 'requires_maintenance', 'is_active']
    search_fields = ['name', 'description']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'asset_type', 'status', 'serial_number', 'last_maintenance_date']
    list_filter = ['location', 'asset_type', 'status', 'manufacturer']
    search_fields = ['name', 'description', 'serial_number', 'qr_code']
    date_hierarchy = 'last_maintenance_date'


@admin.register(MaintenanceSchedule)
class MaintenanceScheduleAdmin(admin.ModelAdmin):
    list_display = ['title', 'asset', 'scheduled_date', 'status', 'assigned_to']
    list_filter = ['asset', 'status', 'assigned_to', 'scheduled_date']
    search_fields = ['title', 'description']
    date_hierarchy = 'scheduled_date'


@admin.register(AssetCheckout)
class AssetCheckoutAdmin(admin.ModelAdmin):
    list_display = ['asset', 'checked_out_by', 'checked_out_at', 'expected_return_at', 'actual_return_at']
    list_filter = ['asset', 'checked_out_by', 'checked_out_at']
    search_fields = ['notes', 'condition_checkout', 'condition_return']
    date_hierarchy = 'checked_out_at'


@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'manager', 'budget_limit', 'current_spend', 'is_active']
    list_filter = ['tenant', 'is_active', 'manager']
    search_fields = ['code', 'name', 'description']


@admin.register(MaintenanceExpense)
class MaintenanceExpenseAdmin(admin.ModelAdmin):
    list_display = ['maintenance_request', 'expense_type', 'amount', 'cost_center', 'invoice_number']
    list_filter = ['expense_type', 'cost_center', 'invoice_date']
    search_fields = ['description', 'invoice_number']
    date_hierarchy = 'created_at'
