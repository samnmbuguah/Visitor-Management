from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from ..models import (
    Visitor,
    Location,
    Host,
    Kiosk,
    NotificationTemplate,
    NotificationLog,
    PreRegistration,
    WatchlistEntry,
    UserProfile,
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

    class Meta:
        model = Visitor
        fields = ['id', 'name', 'email', 'phone', 'company', 'host', 'host_name',
                  'purpose', 'photo', 'location', 'location_name', 'kiosk', 'kiosk_name',
                  'checkin_time', 'checkout_time', 'expected_duration', 'status', 'badge_number']
        read_only_fields = ['id', 'checkin_time', 'status', 'badge_number']


class VisitorCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating visitors."""
    class Meta:
        model = Visitor
        fields = ['id', 'name', 'email', 'phone', 'company', 'host', 'purpose', 'photo',
                  'location', 'kiosk', 'expected_duration', 'status', 'nda_accepted', 'signature']
        read_only_fields = ['id', 'status']


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

    class Meta:
        model = PreRegistration
        fields = ['id', 'visitor_name', 'visitor_email', 'visitor_phone', 'visitor_company',
                  'host', 'host_name', 'location', 'location_name', 'expected_arrival',
                  'status', 'token', 'qr_code', 'created_at']
        read_only_fields = ['id', 'token', 'status', 'created_at']

    def get_qr_code(self, obj):
        return QRCodeService.generate_qr_code(str(obj.token))


class WatchlistSerializer(serializers.ModelSerializer):
    """Serializer for watchlist entries."""
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = WatchlistEntry
        fields = ['id', 'name', 'email', 'phone', 'match_type', 'reason', 'is_active', 'location', 'location_name', 'created_at']
        read_only_fields = ['id', 'created_at']

