from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Set up periodic tasks for overdue visitor checking'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Check interval in minutes (default: 5)',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        
        self.stdout.write(
            self.style.SUCCESS(f'Setting up periodic task to check every {interval} minutes...')
        )
        
        # This would typically set up Celery beat schedule
        # For now, we'll provide instructions for manual setup
        
        self.stdout.write(
            self.style.SUCCESS('\nTo enable automatic overdue checking:')
        )
        self.stdout.write(
            self.style.SUCCESS('1. Add to your celery.py:')
        )
        self.stdout.write(
            self.style.SUCCESS('   from visitors.tasks import check_overdue_visitors')
        )
        self.stdout.write(
            self.style.SUCCESS('2. Configure celery beat schedule:')
        )
        self.stdout.write(
            self.style.SUCCESS('   CELERYBEAT_SCHEDULE = {')
        )
        self.stdout.write(
            self.style.SUCCESS('       "check-overdue-visitors": {')
        )
        self.stdout.write(
            self.style.SUCCESS(f'           "schedule": crontab(minute="*/{interval}")')
        )
        self.stdout.write(
            self.style.SUCCESS('       },')
        )
        self.stdout.write(
            self.style.SUCCESS('   }')
        )
        
        self.stdout.write(
            self.style.SUCCESS('\n3. Start celery beat:')
        )
        self.stdout.write(
            self.style.SUCCESS('   celery -A visitors beat --loglevel=info')
        )
        
        self.stdout.write(
            self.style.SUCCESS('\n4. Or run manually:')
        )
        self.stdout.write(
            self.style.SUCCESS(f'   python manage.py check_overdue_visitors --grace-minutes=15')
        )
