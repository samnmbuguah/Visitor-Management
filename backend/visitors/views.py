from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Visitor, Host
from .serializers import VisitorSerializer, HostSerializer

class HostViewSet(viewsets.ModelViewSet):
    queryset = Host.objects.all()
    serializer_class = HostSerializer

class VisitorViewSet(viewsets.ModelViewSet):
    queryset = Visitor.objects.all().order_by('-checkin_time')
    serializer_class = VisitorSerializer

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        visitor = self.get_object()
        if visitor.status == 'CHECKED_OUT':
            return Response(
                {'error': 'Visitor already checked out'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        visitor.status = 'CHECKED_OUT'
        visitor.checkout_time = timezone.now()
        visitor.save()
        
        serializer = self.get_serializer(visitor)
        return Response(serializer.data)
