from rest_framework import serializers
from .models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, MaintenancePhoto, WorkOrder,
    AssetType, Asset, MaintenanceSchedule, AssetCheckout, CostCenter, MaintenanceExpense,
    PriorityLevel, MaintenanceStatus, AssetStatus
)
from visitors.serializers import LocationSerializer, HostSerializer


class MaintenanceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceCategory
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    specialties = MaintenanceCategorySerializer(many=True, read_only=True)
    specialty_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Vendor
        fields = '__all__'

    def create(self, validated_data):
        specialty_ids = validated_data.pop('specialty_ids', [])
        vendor = Vendor.objects.create(**validated_data)
        if specialty_ids:
            vendor.specialties.set(specialty_ids)
        return vendor

    def update(self, instance, validated_data):
        specialty_ids = validated_data.pop('specialty_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if specialty_ids is not None:
            instance.specialties.set(specialty_ids)
        
        return instance


class MaintenancePhotoSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = MaintenancePhoto
        fields = '__all__'


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    host = HostSerializer(read_only=True)
    category = MaintenanceCategorySerializer(read_only=True)
    assigned_to = VendorSerializer(read_only=True)
    photos = MaintenancePhotoSerializer(many=True, read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = '__all__'

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            # Set host from authenticated user if not provided
            if 'host' not in validated_data:
                try:
                    from visitors.models import Host
                    validated_data['host'] = Host.objects.get(user=request.user)
                except Host.DoesNotExist:
                    pass
        return super().create(validated_data)


class WorkOrderSerializer(serializers.ModelSerializer):
    maintenance_request = MaintenanceRequestSerializer(read_only=True)
    vendor = VendorSerializer(read_only=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'


class AssetTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = '__all__'


class AssetSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    asset_type = AssetTypeSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_last_maintenance = serializers.SerializerMethodField()
    days_until_next_maintenance = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = '__all__'

    def get_days_since_last_maintenance(self, obj):
        if obj.last_maintenance_date:
            from django.utils import timezone
            return (timezone.now().date() - obj.last_maintenance_date).days
        return None

    def get_days_until_next_maintenance(self, obj):
        if obj.next_maintenance_date:
            from django.utils import timezone
            return (obj.next_maintenance_date - timezone.now().date()).days
        return None


class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    asset = AssetSerializer(read_only=True)
    assigned_to = VendorSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaintenanceSchedule
        fields = '__all__'


class AssetCheckoutSerializer(serializers.ModelSerializer):
    asset = AssetSerializer(read_only=True)
    checked_out_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = AssetCheckout
        fields = '__all__'


class CostCenterSerializer(serializers.ModelSerializer):
    manager = HostSerializer(read_only=True)
    budget_remaining = serializers.SerializerMethodField()

    class Meta:
        model = CostCenter
        fields = '__all__'

    def get_budget_remaining(self, obj):
        if obj.budget_limit:
            return obj.budget_limit - obj.current_spend
        return None


class MaintenanceExpenseSerializer(serializers.ModelSerializer):
    maintenance_request = MaintenanceRequestSerializer(read_only=True)
    cost_center = CostCenterSerializer(read_only=True)

    class Meta:
        model = MaintenanceExpense
        fields = '__all__'


class MaintenanceRequestCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating maintenance requests"""
    photo_data = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = MaintenanceRequest
        fields = ['title', 'description', 'priority', 'category', 'location', 'photo_data']

    def create(self, validated_data):
        photo_data = validated_data.pop('photo_data', [])
        request = MaintenanceRequest.objects.create(**validated_data)
        
        # Create photos if provided
        for i, photo in enumerate(photo_data):
            MaintenancePhoto.objects.create(
                maintenance_request=request,
                photo=photo,
                caption=f"Photo {i+1}",
                is_before_photo=True
            )
        
        return request


class AssetCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating assets with QR code generation"""
    
    class Meta:
        model = Asset
        fields = '__all__'

    def create(self, validated_data):
        # Generate QR code if not provided
        if not validated_data.get('qr_code'):
            import uuid
            validated_data['qr_code'] = str(uuid.uuid4())
        
        # Set next maintenance date if asset type has maintenance interval
        asset_type = validated_data.get('asset_type')
        if asset_type and asset_type.maintenance_interval_days:
            from django.utils import timezone
            validated_data['next_maintenance_date'] = (
                timezone.now().date() + timezone.timedelta(days=asset_type.maintenance_interval_days)
            )
        
        return super().create(validated_data)
