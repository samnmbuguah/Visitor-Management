from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from ..models import Visitor
from ..serializers import VisitorSerializer, VisitorCreateSerializer
from ..services.visitor_service import VisitorService
from ..repositories.visitor_repository import VisitorRepository
from ..interfaces.notification_interfaces import IVisitorRepository, IRBACService


class RefactoredVisitorViewSet(viewsets.ModelViewSet):
    """
    Refactored VisitorViewSet following SOLID principles.
    
    This viewset demonstrates:
    - SRP: Delegates business logic to services
    - OCP: Can be extended without modification
    - LSP: Proper inheritance
    - ISP: Focused interfaces
    - DIP: Depends on abstractions
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.visitor_service = VisitorService(VisitorRepository())
    
    queryset = Visitor.objects.all().order_by('-checkin_time')
    
    def get_permissions(self):
        """Get permissions based on action."""
        if self.action in ['create', 'list', 'checkout', 'search', 'active']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action."""
        if self.action == 'create':
            return VisitorCreateSerializer
        return VisitorSerializer
    
    def get_queryset(self):
        """Get queryset filtered by user role and permissions."""
        user = self.request.user
        return self.visitor_service.get_visitors(user)
    
    def list(self, request, *args, **kwargs):
        """List visitors with proper filtering."""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create visitor with business logic."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        visitor = self.visitor_service.create_visitor(serializer.validated_data)
        
        serializer = VisitorSerializer(visitor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a visitor with RBAC checks."""
        visitor, error = self.visitor_service.approve_visitor(request.user, pk)
        
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = VisitorSerializer(visitor)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a visitor with RBAC checks."""
        visitor, error = self.visitor_service.reject_visitor(request.user, pk)
        
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = VisitorSerializer(visitor)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check out a visitor."""
        visitor, error = self.visitor_service.checkout_visitor(pk)
        
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = VisitorSerializer(visitor)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for visitors by name, email, or phone."""
        query = request.query_params.get('query', '')
        
        if len(query) < 3:
            return Response(
                {'error': 'Query parameter must be at least 3 characters'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        visitors = self.visitor_service.search_visitors(request.user, query)
        serializer = VisitorSerializer(visitors, many=True)
        return Response({'results': serializer.data})
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all currently checked-in visitors."""
        visitors = self.visitor_service.get_active_visitors(request.user)
        serializer = VisitorSerializer(visitors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all visitors for today."""
        visitors = self.visitor_service.get_today_visitors(request.user)
        serializer = VisitorSerializer(visitors, many=True)
        return Response(serializer.data)
