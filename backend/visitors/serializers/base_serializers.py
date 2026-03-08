from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.contrib.auth.models import User
from ..models import (
    User, UserProfile, UserRole, Location, Kiosk, Host, Visitor, 
    PreRegistration, VisitorType, WatchlistEntry, Tenant, NotificationTemplate, NotificationLog
)
from ..services.qrcode_service import QRCodeService


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        
        # Get role from profile if it exists
        try:
            token['role'] = user.profile.role
        except Exception:
            token['role'] = 'HOST'  # Default fallback 

        return token

class UserSerializer(serializers.ModelSerializer):
    """Serializer for Django User model."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profiles with role information."""
    user = UserSerializer(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'role', 'location', 'location_name', 'phone', 'is_admin', 'is_super_admin', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_admin', 'is_super_admin']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserProfile.role.field.choices, default='HOST')
    location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all(), required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role', 'location', 'phone']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        role = validated_data.pop('role', 'HOST')
        location = validated_data.pop('location', None)
        phone = validated_data.pop('phone', '')
        validated_data.pop('password_confirm')

        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(
            user=user,
            role=role,
            location=location,
            phone=phone
        )
        return user


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for locations."""
    kiosk_count = serializers.SerializerMethodField()
    host_count = serializers.SerializerMethodField()
    active_visitor_count = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = ['id', 'name', 'address', 'floor', 'timezone', 'is_active',
                  'require_visitor_approval', 'require_nda', 'nda_content',
                  'kiosk_count', 'host_count', 'active_visitor_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_kiosk_count(self, obj):
        return obj.kiosks.filter(is_active=True).count()

    def get_host_count(self, obj):
        return obj.hosts.filter(is_active=True).count()

    def get_active_visitor_count(self, obj):
        return obj.visitors.filter(status='CHECKED_IN').count()


class KioskSerializer(serializers.ModelSerializer):
    """Serializer for kiosks."""
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = Kiosk
        fields = ['id', 'name', 'location', 'location_name', 'is_active', 'last_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'last_active']


class HostSerializer(serializers.ModelSerializer):
    """Serializer for hosts."""
    location_name = serializers.CharField(source='location.name', read_only=True)
    visitor_count = serializers.SerializerMethodField()

    class Meta:
        model = Host
        fields = ['id', 'name', 'email', 'department', 'phone', 'location', 'location_name',
                  'is_active', 'receive_notifications', 'visitor_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_visitor_count(self, obj):
        return obj.visitors.count()


class VisitorSerializer(serializers.ModelSerializer):
    """Serializer for visitors."""
    host_name = serializers.CharField(source='host.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    kiosk_name = serializers.CharField(source='kiosk.name', read_only=True)
    visitor_type_name = serializers.CharField(source='visitor_type.name', read_only=True)

    class Meta:
        model = Visitor
        fields = ['id', 'name', 'email', 'phone', 'company', 'number_plate', 'host', 'host_name',
                  'visitor_type', 'visitor_type_name', 'purpose', 'photo', 'location', 'location_name', 'kiosk', 'kiosk_name',
                  'checkin_time', 'checkout_time', 'expected_duration', 'status', 'badge_number']
        read_only_fields = ['id', 'checkin_time', 'status', 'badge_number']


class VisitorCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating visitors."""
    class Meta:
        model = Visitor
        fields = ['id', 'name', 'email', 'phone', 'company', 'number_plate', 'host', 'visitor_type', 'purpose', 'expected_duration', 'photo',
                  'location', 'kiosk', 'status', 'nda_accepted', 'signature']
        read_only_fields = ['id']

    def validate(self, attrs):
        attrs = super().validate(attrs)

        location = attrs.get('location')
        nda_accepted = attrs.get('nda_accepted')
        signature = attrs.get('signature')

        if location and getattr(location, 'require_nda', False):
            if not nda_accepted:
                raise serializers.ValidationError({'nda_accepted': 'NDA acceptance is required for this location'})
            if not signature:
                raise serializers.ValidationError({'signature': 'Signature is required when NDA is required'})

        if signature and not nda_accepted:
            raise serializers.ValidationError({'nda_accepted': 'Must accept NDA when providing a signature'})

        return attrs

    def create(self, validated_data):
        nda_accepted = validated_data.get('nda_accepted')
        signature = validated_data.get('signature')

        if nda_accepted and signature:
            validated_data['nda_signed_at'] = timezone.now()

        # Force status to PENDING for receptionist registration
        # This overrides the model default of CHECKED_IN
        validated_data['status'] = 'PENDING'

        return super().create(validated_data)


class VisitorSearchSerializer(serializers.ModelSerializer):
    """Serializer for searching returning visitors (privacy focused)."""
    class Meta:
        model = Visitor
        fields = ['name', 'email', 'phone', 'company']
        read_only_fields = ['name', 'email', 'phone', 'company']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates."""
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = ['id', 'name', 'type', 'subject', 'body', 'is_active',
                  'location', 'location_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs."""
    visitor_name = serializers.CharField(source='visitor.name', read_only=True)
    host_name = serializers.CharField(source='host.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = NotificationLog
        fields = ['id', 'template', 'template_name', 'recipient_email', 'recipient_phone',
                  'subject', 'body', 'sent_at', 'status', 'error_message',
                  'visitor', 'visitor_name', 'host', 'host_name']
        read_only_fields = ['id', 'sent_at']


class PreRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for pre-registration invitations."""
    qr_code = serializers.SerializerMethodField()
    host_name = serializers.CharField(source='host.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    visitor_type_name = serializers.CharField(source='visitor_type.name', read_only=True)

    class Meta:
        model = PreRegistration
        fields = ['id', 'visitor_name', 'visitor_email', 'visitor_phone', 'visitor_company', 'visitor_number_plate',
                  'visitor_type', 'visitor_type_name', 'purpose', 'expected_duration', 'host', 'host_name', 'location', 'location_name', 'expected_arrival',
                  'status', 'token', 'qr_code', 'created_at']
        read_only_fields = ['id', 'token', 'status', 'created_at']

    def get_qr_code(self, obj):
        return QRCodeService.generate_qr_code(str(obj.token))


class VisitorTypeSerializer(serializers.ModelSerializer):
    """Serializer for visitor types."""
    class Meta:
        model = VisitorType
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WatchlistSerializer(serializers.ModelSerializer):
    """Serializer for watchlist entries."""
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = WatchlistEntry
        fields = ['id', 'name', 'email', 'phone', 'match_type', 'reason', 'is_active', 'location', 'location_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class VisitorActionSerializer(serializers.Serializer):
    """Simple serializer for visitor approval/rejection actions."""
    notes = serializers.CharField(required=False, allow_blank=True)

