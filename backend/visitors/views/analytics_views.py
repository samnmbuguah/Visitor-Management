from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncHour, ExtractHour
from django.utils import timezone
from datetime import timedelta
from ..models import Visitor, Host, Location


class DashboardStatsView(APIView):
    """Get dashboard statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        today = timezone.now().date()

        # Base querysets
        visitors_qs = Visitor.objects.all()
        hosts_qs = Host.objects.filter(is_active=True)

        if location_id:
            visitors_qs = visitors_qs.filter(location_id=location_id)
            hosts_qs = hosts_qs.filter(location_id=location_id)

        # Today's stats
        today_visitors = visitors_qs.filter(checkin_time__date=today)
        active_visitors = visitors_qs.filter(status='CHECKED_IN')

        # This week's stats
        week_start = today - timedelta(days=today.weekday())
        week_visitors = visitors_qs.filter(checkin_time__date__gte=week_start)

        # This month's stats
        month_start = today.replace(day=1)
        month_visitors = visitors_qs.filter(checkin_time__date__gte=month_start)

        # Average visit duration (for checked out visitors)
        checked_out = visitors_qs.filter(
            status='CHECKED_OUT',
            checkout_time__isnull=False
        ).exclude(checkout_time=None)

        avg_duration = None
        if checked_out.exists():
            total_duration = sum([
                (v.checkout_time - v.checkin_time).total_seconds() / 60
                for v in checked_out[:100]  # Limit for performance
            ])
            avg_duration = round(total_duration / checked_out.count()[:100], 1)

        return Response({
            'active_visitors': active_visitors.count(),
            'today_visitors': today_visitors.count(),
            'week_visitors': week_visitors.count(),
            'month_visitors': month_visitors.count(),
            'total_hosts': hosts_qs.count(),
            'total_locations': Location.objects.filter(is_active=True).count(),
            'avg_visit_duration_minutes': avg_duration,
        })


class VisitorTrendsView(APIView):
    """Get visitor trends over time."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        days = int(request.query_params.get('days', 30))

        start_date = timezone.now().date() - timedelta(days=days)

        visitors_qs = Visitor.objects.filter(checkin_time__date__gte=start_date)
        if location_id:
            visitors_qs = visitors_qs.filter(location_id=location_id)

        # Group by date
        daily_counts = (
            visitors_qs
            .annotate(date=TruncDate('checkin_time'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        return Response({
            'period_days': days,
            'data': list(daily_counts)
        })


class PeakHoursView(APIView):
    """Get peak visitor hours."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        days = int(request.query_params.get('days', 7))

        start_date = timezone.now() - timedelta(days=days)

        visitors_qs = Visitor.objects.filter(checkin_time__gte=start_date)
        if location_id:
            visitors_qs = visitors_qs.filter(location_id=location_id)

        # Group by hour
        hourly_counts = (
            visitors_qs
            .annotate(hour=ExtractHour('checkin_time'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )

        # Fill in missing hours with 0
        hours_data = {item['hour']: item['count'] for item in hourly_counts}
        full_data = [{'hour': h, 'count': hours_data.get(h, 0)} for h in range(24)]

        return Response({
            'period_days': days,
            'data': full_data
        })


class HostStatsView(APIView):
    """Get statistics per host."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        days = int(request.query_params.get('days', 30))

        start_date = timezone.now() - timedelta(days=days)

        hosts_qs = Host.objects.filter(is_active=True)
        if location_id:
            hosts_qs = hosts_qs.filter(location_id=location_id)

        # Annotate with visitor counts
        host_stats = (
            hosts_qs
            .annotate(
                total_visitors=Count('visitors'),
                recent_visitors=Count(
                    'visitors',
                    filter=Visitor.objects.filter(checkin_time__gte=start_date).query.where
                ) if False else Count('visitors')  # Simplified for now
            )
            .values('id', 'name', 'department', 'total_visitors')
            .order_by('-total_visitors')[:20]
        )

        return Response({
            'period_days': days,
            'data': list(host_stats)
        })


class LocationStatsView(APIView):
    """Get statistics per location."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        locations = Location.objects.filter(is_active=True)

        location_stats = []
        for loc in locations:
            visitors_qs = Visitor.objects.filter(location=loc)
            recent_visitors = visitors_qs.filter(checkin_time__gte=start_date)

            location_stats.append({
                'id': loc.id,
                'name': loc.name,
                'total_visitors': visitors_qs.count(),
                'recent_visitors': recent_visitors.count(),
                'active_visitors': visitors_qs.filter(status='CHECKED_IN').count(),
                'host_count': Host.objects.filter(location=loc, is_active=True).count(),
            })

        return Response({
            'period_days': days,
            'data': sorted(location_stats, key=lambda x: -x['recent_visitors'])
        })
