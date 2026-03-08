from django.core.management.base import BaseCommand
from django.utils import timezone
from visitors.services.overdue_notifications import OverdueNotificationService


class Command(BaseCommand):
    help = 'Check for overdue visitors and send notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode (only show what would be sent)',
        )
        parser.add_argument(
            '--grace-minutes',
            type=int,
            default=15,
            help='Grace period in minutes before considering a visitor overdue (default: 15)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        grace_minutes = options['grace_minutes']
        
        self.stdout.write(
            self.style.SUCCESS('Checking for overdue visitors...')
        )
        self.stdout.write(
            self.style.SUCCESS(f'Grace period: {grace_minutes} minutes')
        )
        
        # Get overdue visitors
        overdue_visitors = OverdueNotificationService.check_overdue_visitors()
        
        if not overdue_visitors:
            self.stdout.write(
                self.style.SUCCESS('No overdue visitors found.')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(f'Found {len(overdue_visitors)} overdue visitor(s)')
        )
        
        # Display overdue visitors
        for overdue_info in overdue_visitors:
            visitor = overdue_info['visitor']
            overdue_minutes = overdue_info['overdue_minutes']
            
            self.stdout.write(
                self.style.ERROR(
                    f'\nOVERDUE: {visitor.name}'
                )
            )
            self.stdout.write(
                f'  Email: {visitor.email}'
            )
            self.stdout.write(
                f'  Phone: {visitor.phone}'
            )
            self.stdout.write(
                f'  Host: {visitor.host.name if visitor.host else "N/A"}'
            )
            self.stdout.write(
                f'  Location: {visitor.location.name if visitor.location else "N/A"}'
            )
            self.stdout.write(
                f'  Expected Duration: {visitor.expected_duration} minutes'
            )
            self.stdout.write(
                f'  Check-in Time: {visitor.checkin_time.strftime("%Y-%m-%d %H:%M")}'
            )
            self.stdout.write(
                f'  Expected Checkout: {overdue_info["expected_checkout"].strftime("%Y-%m-%d %H:%M")}'
            )
            self.stdout.write(
                f'  Overdue by: {overdue_minutes} minutes'
            )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\nDRY RUN: No notifications sent.')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nSending notifications...')
            )
            
            # Send notifications
            OverdueNotificationService.send_overdue_notifications(overdue_visitors)
            
            self.stdout.write(
                self.style.SUCCESS(f'Notifications sent for {len(overdue_visitors)} overdue visitor(s)')
            )
