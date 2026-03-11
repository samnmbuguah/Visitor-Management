"""
Unified seed command that runs all data seeders in order and adds
seed data for models not covered by existing commands.

Usage:
    python manage.py seed_all
    python manage.py seed_all --tenants 1 --skip-existing
"""

import os
import random
from datetime import timedelta, date

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone

from visitors.models import (
    Tenant, Location, Host, Parcel, WatchlistEntry,
    NotificationTemplate, Visitor
)
from property_management.models import Lease, LeaseStatus


class Command(BaseCommand):
    help = 'Run all data seeders and populate missing models'

    def add_arguments(self, parser):
        parser.add_argument('--tenants', type=int, default=3, help='Tenants to create')
        parser.add_argument('--users-per-tenant', type=int, default=5, help='Users per tenant')
        parser.add_argument('--locations-per-tenant', type=int, default=2, help='Locations per tenant')
        parser.add_argument('--hosts-per-location', type=int, default=3, help='Hosts per location')
        parser.add_argument('--visitors-per-day', type=int, default=10, help='Visitors per day')
        parser.add_argument('--days', type=int, default=7, help='Days of visitor history')
        parser.add_argument('--skip-existing', action='store_true', help='Skip seeders if data exists')

    def handle(self, *args, **options):
        skip = options['skip_existing']

        self.stdout.write(self.style.MIGRATE_HEADING('=== Running All Seeders ==='))

        # 1. Visitor types (no dependencies)
        if skip and self._has_data('visitors.VisitorType'):
            self.stdout.write('  Skipping seed_visitor_types (data exists)')
        else:
            self.stdout.write(self.style.MIGRATE_HEADING('\n[1/4] Seeding visitor types...'))
            call_command('seed_visitor_types')

        # 2. Comprehensive data (tenants, users, locations, visitors, etc.)
        if skip and self._has_data('visitors.Tenant'):
            self.stdout.write('  Skipping seed_comprehensive_data (data exists)')
        else:
            self.stdout.write(self.style.MIGRATE_HEADING('\n[2/4] Seeding comprehensive data...'))
            call_command(
                'seed_comprehensive_data',
                tenants=options['tenants'],
                **{k.replace('-', '_'): v for k, v in {
                    'users-per-tenant': options['users_per_tenant'],
                    'locations-per-tenant': options['locations_per_tenant'],
                    'hosts-per-location': options['hosts_per_location'],
                    'visitors-per-day': options['visitors_per_day'],
                    'days': options['days'],
                }.items()}
            )

        # 3. Property management data (assets, maintenance, vendors, etc.)
        # Note: this seeder uses create() not get_or_create() for several
        # models with unique constraints, so it cannot be re-run idempotently.
        if self._has_data('property_management.Asset'):
            if skip:
                self.stdout.write('  Skipping seed_property_management_data (data exists)')
            else:
                self.stdout.write(self.style.MIGRATE_HEADING('\n[3/4] Seeding property management data (clearing old data first)...'))
                call_command(
                    'seed_property_management_data',
                    tenants=options['tenants'],
                    clear=True,
                )
        else:
            self.stdout.write(self.style.MIGRATE_HEADING('\n[3/4] Seeding property management data...'))
            call_command(
                'seed_property_management_data',
                tenants=options['tenants'],
            )

        # 4. Additional models not covered by existing seeders
        self.stdout.write(self.style.MIGRATE_HEADING('\n[4/4] Seeding additional models...'))
        tenants = list(Tenant.objects.all())

        if not tenants:
            self.stdout.write(self.style.WARNING('  No tenants found — skipping additional models'))
        else:
            self.seed_notification_templates(tenants)
            self.seed_watchlist_entries(tenants)
            self.seed_parcels(tenants)
            self.seed_leases(tenants)
            self.link_superusers_to_tenant(tenants[0])

        self.stdout.write(self.style.SUCCESS('\n=== All seeders completed successfully! ==='))
        self._print_summary()

    def link_superusers_to_tenant(self, tenant):
        """Link all superusers (like admin) to the first tenant so they can see data."""
        from django.contrib.auth import get_user_model
        from visitors.tenant_models import TenantUser
        User = get_user_model()
        
        superusers = User.objects.filter(is_superuser=True)
        count = 0
        for su in superusers:
            if not TenantUser.objects.filter(user=su).exists():
                TenantUser.objects.create(
                    tenant=tenant,
                    user=su,
                    role='OWNER'
                )
                count += 1
                
        if count > 0:
            self.stdout.write(f"  Linked {count} superuser(s) to tenant '{tenant.name}' for data visibility")


    # ------------------------------------------------------------------
    # Notification templates
    # ------------------------------------------------------------------
    def seed_notification_templates(self, tenants):
        self.stdout.write('  Seeding notification templates...')

        templates = [
            {
                'name': 'Visitor Arrival Alert',
                'type': 'VISITOR_ARRIVAL',
                'subject': 'Your visitor {{visitor_name}} has arrived',
                'body': (
                    'Hello {{host_name}},\n\n'
                    '{{visitor_name}} from {{visitor_company}} has checked in '
                    'at {{location_name}} on {{checkin_time}}.\n\n'
                    'Please proceed to the lobby to greet your visitor.\n\n'
                    'Regards,\nVisitor Management System'
                ),
            },
            {
                'name': 'Visitor Checkout Notification',
                'type': 'VISITOR_CHECKOUT',
                'subject': '{{visitor_name}} has checked out',
                'body': (
                    'Hello {{host_name}},\n\n'
                    '{{visitor_name}} has checked out at {{checkout_time}}.\n'
                    'Visit duration: {{duration}}.\n\n'
                    'Regards,\nVisitor Management System'
                ),
            },
            {
                'name': 'Pre-Registration Invite',
                'type': 'PRE_REGISTRATION',
                'subject': 'You have been invited to visit {{location_name}}',
                'body': (
                    'Hello {{visitor_name}},\n\n'
                    'You have been invited to visit {{location_name}} by {{host_name}} '
                    'on {{expected_arrival}}.\n\n'
                    'Please use the following link to pre-register: {{registration_link}}\n\n'
                    'Regards,\nVisitor Management System'
                ),
            },
            {
                'name': 'Overstay Alert',
                'type': 'OVERSTAY_ALERT',
                'subject': 'Visitor overstay alert: {{visitor_name}}',
                'body': (
                    'Hello {{host_name}},\n\n'
                    '{{visitor_name}} has exceeded their expected visit duration '
                    'at {{location_name}}.\n\n'
                    'Check-in time: {{checkin_time}}\n'
                    'Expected duration: {{expected_duration}} minutes\n\n'
                    'Please follow up with your visitor.\n\n'
                    'Regards,\nVisitor Management System'
                ),
            },
            {
                'name': 'Visitor Confirmation',
                'type': 'VISITOR_CONFIRMATION',
                'subject': 'Visitor registration confirmed for {{location_name}}',
                'body': (
                    'Hello {{visitor_name}},\n\n'
                    'Your visit has been confirmed.\n\n'
                    'Location: {{location_name}}\n'
                    'Host: {{host_name}}\n'
                    'Date: {{expected_arrival}}\n\n'
                    'Please bring a valid ID for check-in.\n\n'
                    'Regards,\nVisitor Management System'
                ),
            },
        ]

        created = 0
        for tmpl in templates:
            _, was_created = NotificationTemplate.objects.get_or_create(
                name=tmpl['name'],
                defaults=tmpl,
            )
            if was_created:
                created += 1
        self.stdout.write(f'    Created {created} notification templates')

    # ------------------------------------------------------------------
    # Watchlist entries
    # ------------------------------------------------------------------
    def seed_watchlist_entries(self, tenants):
        self.stdout.write('  Seeding watchlist entries...')

        entries_data = [
            {
                'name': 'John Banned',
                'email': 'jbanned@example.com',
                'phone': '+15551234567',
                'match_type': 'EXACT',
                'reason': 'Previous security incident — denied entry per policy.',
            },
            {
                'name': 'Suspicious Person',
                'email': '',
                'phone': '',
                'match_type': 'CONTAINS',
                'reason': 'Flagged by security for repeated tailgating attempts.',
            },
            {
                'name': '',
                'email': 'threat@malicious.com',
                'phone': '',
                'match_type': 'EXACT',
                'reason': 'Email associated with phishing; deny entry until cleared.',
            },
            {
                'name': 'Former Employee',
                'email': 'former.employee@company.com',
                'phone': '+15559876543',
                'match_type': 'EXACT',
                'reason': 'Employment terminated. Access revoked on 2025-12-01.',
            },
        ]

        created = 0
        for tenant in tenants:
            locations = list(Location.objects.filter(tenant=tenant))
            for entry in entries_data:
                _, was_created = WatchlistEntry.objects.get_or_create(
                    name=entry['name'],
                    email=entry['email'],
                    reason=entry['reason'],
                    defaults={
                        'phone': entry['phone'],
                        'match_type': entry['match_type'],
                        'location': random.choice(locations) if locations else None,
                    },
                )
                if was_created:
                    created += 1
        self.stdout.write(f'    Created {created} watchlist entries')

    # ------------------------------------------------------------------
    # Parcels
    # ------------------------------------------------------------------
    def seed_parcels(self, tenants):
        self.stdout.write('  Seeding parcels...')

        couriers = ['DHL', 'FedEx', 'UPS', 'USPS', 'Amazon Logistics', 'Royal Mail']
        statuses = ['RECEIVED', 'NOTIFIED', 'COLLECTED']

        created = 0
        for tenant in tenants:
            hosts = list(Host.objects.filter(tenant=tenant))
            locations = list(Location.objects.filter(tenant=tenant))
            if not hosts or not locations:
                continue

            for i in range(10):
                host = random.choice(hosts)
                location = random.choice(locations)
                status = random.choice(statuses)

                Parcel.objects.create(
                    recipient=host,
                    location=location,
                    courier=random.choice(couriers),
                    tracking_number=f'TRK{random.randint(100000000, 999999999)}',
                    status=status,
                    signature_required=random.choice([True, False]),
                    collected_at=timezone.now() - timedelta(hours=random.randint(1, 48)) if status == 'COLLECTED' else None,
                )
                created += 1
        self.stdout.write(f'    Created {created} parcels')

    # ------------------------------------------------------------------
    # Leases
    # ------------------------------------------------------------------
    def seed_leases(self, tenants):
        self.stdout.write('  Seeding leases...')

        unit_prefixes = ['A', 'B', 'C', 'D', 'E']

        created = 0
        for tenant in tenants:
            for i in range(random.randint(5, 8)):
                start = date.today() - timedelta(days=random.randint(30, 730))
                end = start + timedelta(days=random.choice([180, 365, 730]))
                today = date.today()

                if end < today:
                    status = LeaseStatus.EXPIRED
                elif (end - today).days <= 60:
                    status = LeaseStatus.EXPIRING
                else:
                    status = random.choice([LeaseStatus.ACTIVE, LeaseStatus.ACTIVE, LeaseStatus.TERMINATED])

                Lease.objects.create(
                    tenant=tenant,
                    unit_number=f'{random.choice(unit_prefixes)}{random.randint(100, 999)}',
                    monthly_rent=random.choice([1500, 2000, 2500, 3000, 4500, 6000, 8500]),
                    start_date=start,
                    end_date=end,
                    status=status,
                    notes=f'Lease for unit in {tenant.name}' if random.random() > 0.5 else '',
                )
                created += 1
        self.stdout.write(f'    Created {created} leases')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _has_data(self, model_label):
        from django.apps import apps
        model = apps.get_model(model_label)
        return model.objects.exists()

    def _print_summary(self):
        from django.apps import apps

        self.stdout.write('\n' + '=' * 55)
        self.stdout.write('  SEED DATA SUMMARY')
        self.stdout.write('=' * 55)

        models = [
            ('visitors', 'Tenant'),
            ('visitors', 'Location'),
            ('visitors', 'Host'),
            ('visitors', 'Visitor'),
            ('visitors', 'PreRegistration'),
            ('visitors', 'VisitorType'),
            ('visitors', 'Kiosk'),
            ('visitors', 'NotificationTemplate'),
            ('visitors', 'WatchlistEntry'),
            ('visitors', 'Parcel'),
            ('property_management', 'Asset'),
            ('property_management', 'AssetType'),
            ('property_management', 'MaintenanceRequest'),
            ('property_management', 'WorkOrder'),
            ('property_management', 'Vendor'),
            ('property_management', 'CostCenter'),
            ('property_management', 'Lease'),
        ]

        for app, model_name in models:
            try:
                model = apps.get_model(app, model_name)
                count = model.objects.count()
                self.stdout.write(f'  {model_name:.<30} {count}')
            except LookupError:
                pass

        self.stdout.write('=' * 55)
