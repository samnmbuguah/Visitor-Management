from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from ..models import NotificationTemplate, EmailNotificationLog
from ..serializers import NotificationTemplateSerializer, NotificationLogSerializer


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification templates."""
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated for admin actions

    def get_queryset(self):
        queryset = NotificationTemplate.objects.all()

        # Filter by type
        template_type = self.request.query_params.get('type')
        if template_type:
            queryset = queryset.filter(type=template_type)

        # Filter by location
        location_id = self.request.query_params.get('location')
        if location_id:
            queryset = queryset.filter(location_id=location_id)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset


class NotificationLogViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification logs."""
    queryset = EmailNotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]  # TODO: Change to IsAuthenticated

    def get_queryset(self):
        queryset = EmailNotificationLog.objects.all()

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by visitor
        visitor_id = self.request.query_params.get('visitor')
        if visitor_id:
            queryset = queryset.filter(visitor_id=visitor_id)

        # Filter by host
        host_id = self.request.query_params.get('host')
        if host_id:
            queryset = queryset.filter(host_id=host_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(sent_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sent_at__date__lte=end_date)

        return queryset
