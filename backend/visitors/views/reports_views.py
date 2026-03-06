from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg, Max, Min
from django.db.models.functions import TruncDate, TruncHour, ExtractHour
from django.utils import timezone
from datetime import timedelta, date
from ..models import Visitor, PreRegistration, Location, Host
import logging

logger = logging.getLogger(__name__)


class DailyReportView(APIView):
    """Comprehensive daily visit report for admin dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location')
        report_date = request.query_params.get('date')
        
        # Default to today if no date provided
        if report_date:
            try:
                target_date = date.fromisoformat(report_date)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        else:
            target_date = timezone.now().date()
        
        start_of_day = timezone.make_aware(timezone.datetime.combine(target_date, timezone.datetime.min.time()))
        end_of_day = start_of_day + timedelta(days=1)
        
        logger.info(f"[DAILY_REPORT] Generating report for {target_date} by {request.user}")
        
        # Base querysets
        visitors_qs = Visitor.objects.filter(checkin_time__gte=start_of_day, checkin_time__lt=end_of_day)
        pre_regs_qs = PreRegistration.objects.filter(expected_arrival__date=target_date)
        
        if location_id:
            visitors_qs = visitors_qs.filter(location_id=location_id)
            pre_regs_qs = pre_regs_qs.filter(location_id=location_id)
        
        # Basic stats
        total_visitors = visitors_qs.count()
        active_visitors = visitors_qs.filter(status='CHECKED_IN').count()
        checked_out_visitors = visitors_qs.filter(status='CHECKED_OUT').count()
        pre_registered_count = visitors_qs.filter(pre_registration__isnull=False).count()
        walk_in_count = total_visitors - pre_registered_count
        
        # Time-based analytics
        hourly_stats = (
            visitors_qs
            .annotate(hour=ExtractHour('checkin_time'))
            .values('hour')
            .annotate(count=Count('id'))
            .order_by('hour')
        )
        
        # Fill missing hours with 0
        hours_data = {item['hour']: item['count'] for item in hourly_stats}
        full_hourly_data = [{'hour': h, 'count': hours_data.get(h, 0)} for h in range(24)]
        
        # Peak hour
        peak_hour = max(hours_data.items(), key=lambda x: x[1]) if hours_data else (None, 0)
        
        # Duration stats (for checked out visitors)
        checked_out_with_duration = visitors_qs.filter(
            status='CHECKED_OUT',
            checkout_time__isnull=False
        ).exclude(checkout_time=None)
        
        duration_stats = {}
        if checked_out_with_duration.exists():
            durations = [
                (v.checkout_time - v.checkin_time).total_seconds() / 60
                for v in checked_out_with_duration
            ]
            duration_stats = {
                'avg_duration': round(sum(durations) / len(durations), 1),
                'min_duration': round(min(durations), 1),
                'max_duration': round(max(durations), 1),
                'total_duration': round(sum(durations), 1)
            }
        
        # Purpose breakdown
        purpose_stats = (
            visitors_qs
            .values('purpose')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Host breakdown
        host_stats = (
            visitors_qs
            .values('host__name', 'host__department')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Company breakdown
        company_stats = (
            visitors_qs
            .exclude(company='')
            .values('company')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Vehicle stats
        with_vehicles = visitors_qs.exclude(number_plate='').count()
        without_vehicles = total_visitors - with_vehicles
        
        # Pre-registration stats
        pre_reg_stats = {
            'total_invites': pre_regs_qs.count(),
            'used_invites': pre_regs_qs.filter(status='USED').count(),
            'pending_invites': pre_regs_qs.filter(status='PENDING').count(),
            'cancelled_invites': pre_regs_qs.filter(status='CANCELLED').count()
        }
        
        # Overstay analysis (visitors still checked in after expected duration)
        overstays = []
        if location_id:
            location = Location.objects.filter(id=location_id).first()
            if location and location.default_visit_duration:
                threshold = timezone.now() - timedelta(minutes=location.default_visit_duration)
                overstays = (
                    visitors_qs
                    .filter(status='CHECKED_IN', checkin_time__lt=threshold)
                    .values('id', 'name', 'company', 'checkin_time', 'host__name')
                )
        
        # Comparison with previous day/week
        prev_day = target_date - timedelta(days=1)
        prev_day_start = timezone.make_aware(timezone.datetime.combine(prev_day, timezone.datetime.min.time()))
        prev_day_end = prev_day_start + timedelta(days=1)
        
        prev_day_visitors = Visitor.objects.filter(
            checkin_time__gte=prev_day_start,
            checkin_time__lt=prev_day_end
        )
        if location_id:
            prev_day_visitors = prev_day_visitors.filter(location_id=location_id)
        
        prev_day_count = prev_day_visitors.count()
        day_over_day_change = ((total_visitors - prev_day_count) / prev_day_count * 100) if prev_day_count > 0 else 0
        
        # Same day last week
        prev_week = target_date - timedelta(days=7)
        prev_week_start = timezone.make_aware(timezone.datetime.combine(prev_week, timezone.datetime.min.time()))
        prev_week_end = prev_week_start + timedelta(days=1)
        
        prev_week_visitors = Visitor.objects.filter(
            checkin_time__gte=prev_week_start,
            checkin_time__lt=prev_week_end
        )
        if location_id:
            prev_week_visitors = prev_week_visitors.filter(location_id=location_id)
        
        prev_week_count = prev_week_visitors.count()
        week_over_week_change = ((total_visitors - prev_week_count) / prev_week_count * 100) if prev_week_count > 0 else 0
        
        report_data = {
            'report_date': target_date.isoformat(),
            'location_id': location_id,
            'summary': {
                'total_visitors': total_visitors,
                'active_visitors': active_visitors,
                'checked_out_visitors': checked_out_visitors,
                'pre_registered': pre_registered_count,
                'walk_ins': walk_in_count,
                'peak_hour': peak_hour[0],
                'peak_hour_visitors': peak_hour[1],
                'vehicles': {
                    'with_vehicles': with_vehicles,
                    'without_vehicles': without_vehicles,
                    'vehicle_percentage': round((with_vehicles / total_visitors * 100), 1) if total_visitors > 0 else 0
                }
            },
            'duration_stats': duration_stats,
            'hourly_breakdown': full_hourly_data,
            'purpose_breakdown': list(purpose_stats),
            'host_breakdown': list(host_stats),
            'company_breakdown': list(company_stats),
            'pre_registration_stats': pre_reg_stats,
            'overstays': list(overstays),
            'comparisons': {
                'previous_day': {
                    'count': prev_day_count,
                    'change_percent': round(day_over_day_change, 1)
                },
                'previous_week': {
                    'count': prev_week_count,
                    'change_percent': round(week_over_week_change, 1)
                }
            }
        }
        
        logger.info(f"[DAILY_REPORT] Generated report for {target_date}: {total_visitors} visitors")
        
        return Response(report_data)


class VisitTrendsExtendedView(APIView):
    """Visit trends over time with multiple granularity options."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        location_id = request.query_params.get('location')
        days = int(request.query_params.get('days', 30))
        granularity = request.query_params.get('granularity', 'daily')  # hourly, daily, weekly
        
        start_date = timezone.now() - timedelta(days=days)
        
        visitors_qs = Visitor.objects.filter(checkin_time__gte=start_date)
        if location_id:
            visitors_qs = visitors_qs.filter(location_id=location_id)
        
        if granularity == 'hourly':
            # Group by hour
            trends = (
                visitors_qs
                .annotate(period=TruncHour('checkin_time'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )
        elif granularity == 'weekly':
            # Group by week
            trends = (
                visitors_qs
                .annotate(period=TruncDate('checkin_time'))
                .annotate(week=ExtractHour('checkin_time') / 24 / 7)
                .values('week')
                .annotate(
                    period=Min('checkin_time'),
                    count=Count('id')
                )
                .order_by('week')
            )
        else:  # daily
            # Group by date
            trends = (
                visitors_qs
                .annotate(period=TruncDate('checkin_time'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )
        
        return Response({
            'period_days': days,
            'granularity': granularity,
            'data': list(trends)
        })
