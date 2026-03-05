from rest_framework import serializers
from ..models import Parcel, Host, Location

class ParcelSerializer(serializers.ModelSerializer):
    recipient_name = serializers.ReadOnlyField(source='recipient.name')
    location_name = serializers.ReadOnlyField(source='location.name')

    class Meta:
        model = Parcel
        fields = [
            'id', 'recipient', 'recipient_name', 'location', 'location_name', 
            'courier', 'tracking_number', 'received_at', 'status', 'photo', 
            'signature_required', 'collected_at', 'collection_signature', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['received_at', 'collected_at', 'created_at', 'updated_at']

class ParcelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parcel
        fields = [
            'recipient', 'location', 'courier', 'tracking_number', 
            'photo', 'signature_required'
        ]

class ParcelCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parcel
        fields = ['collection_signature']
