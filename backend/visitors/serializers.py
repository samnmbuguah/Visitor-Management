from rest_framework import serializers
from .models import Visitor, Host

class HostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Host
        fields = '__all__'

class VisitorSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source='host.name', read_only=True)
    
    class Meta:
        model = Visitor
        fields = '__all__'
        extra_kwargs = {
            'checkin_time': {'read_only': True},
            'status': {'read_only': True}
        }
