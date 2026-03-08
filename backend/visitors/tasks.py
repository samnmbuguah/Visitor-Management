from celery import shared_task
from django.utils import timezone
from .services.overdue_notifications import OverdueNotificationService


@shared_task
def check_overdue_visitors():
    """
    Celery task to check for overdue visitors and send notifications.
    This task should be scheduled to run periodically.
    """
    try:
        overdue_visitors = OverdueNotificationService.check_overdue_visitors()
        
        if overdue_visitors:
            OverdueNotificationService.send_overdue_notifications(overdue_visitors)
            return {
                'status': 'success',
                'overdue_count': len(overdue_visitors),
                'message': f'Processed {len(overdue_visitors)} overdue visitors'
            }
        else:
            return {
                'status': 'success',
                'overdue_count': 0,
                'message': 'No overdue visitors found'
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'message': f'Error checking overdue visitors: {str(e)}'
        }
