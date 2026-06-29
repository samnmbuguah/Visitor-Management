import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
from visitors.models import (
    Location, Host, Kiosk, Visitor, PreRegistration
)
from visitors.tenant_models import (
    Tenant, TenantUser, SubscriptionPlan, Subscription, TenantSettings
)
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed comprehensive test data for multi-tenant visitor management system'

    def add_arguments(self, parser):
        parser.add_argument('--tenants', type=int, default=3, help='Number of tenants to create')
        parser.add_argument('--users-per-tenant', type=int, default=10, help='Users per tenant')
        parser.add_argument('--locations-per-tenant', type=int, default=2, help='Locations per tenant')
        parser.add_argument('--hosts-per-location', type=int, default=5, help='Hosts per location')
        parser.add_argument('--visitors-per-day', type=int, default=20, help='Visitors to generate per day')
        parser.add_argument('--days', type=int, default=30, help='Number of days to generate visitor data for')

    def handle(self, *args, **options):
        num_tenants = options['tenants']
        users_per_tenant = options['users_per_tenant']
        locations_per_tenant = options['locations_per_tenant']
        hosts_per_location = options['hosts_per_location']
        visitors_per_day = options['visitors_per_day']
        days = options['days']

        self.stdout.write(f"Creating {num_tenants} tenants with comprehensive data...")

        # Create subscription plans
        self.create_subscription_plans()

        # Create tenants
        for i in range(num_tenants):
            self.create_tenant_with_data(
                tenant_num=i + 1,
                users_per_tenant=users_per_tenant,
                locations_per_tenant=locations_per_tenant,
                hosts_per_location=hosts_per_location,
                visitors_per_day=visitors_per_day,
                days=days
            )

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded data for {num_tenants} tenants!"))

    def create_subscription_plans(self):
        """Create subscription plans if they don't exist."""
        plans_data = [
            {
                'name': 'Starter',
                'slug': 'starter',
                'tier': 'STARTER',
                'monthly_price': 29.99,
                'yearly_price': 299.99,
                'max_users': 5,
                'max_locations': 1,
                'max_visitors_per_month': 100,
                'has_api_access': False,
                'has_custom_domain': False,
                'has_sso': False,
                'has_advanced_analytics': False,
                'has_ocr_integration': False,
                'has_gate_automation': False,
                'description': 'Perfect for small offices and startups',
                'features': ['Basic visitor management', 'Email notifications', 'Mobile apps']
            },
            {
                'name': 'Professional',
                'slug': 'professional',
                'tier': 'PROFESSIONAL',
                'monthly_price': 99.99,
                'yearly_price': 999.99,
                'max_users': 25,
                'max_locations': 5,
                'max_visitors_per_month': 1000,
                'has_api_access': True,
                'has_custom_domain': False,
                'has_sso': False,
                'has_advanced_analytics': True,
                'has_ocr_integration': False,
                'has_gate_automation': False,
                'description': 'Ideal for growing businesses',
                'features': ['Everything in Starter', 'API access', 'Advanced analytics', 'Custom branding']
            },
            {
                'name': 'Enterprise',
                'slug': 'enterprise',
                'tier': 'ENTERPRISE',
                'monthly_price': 299.99,
                'yearly_price': 2999.99,
                'max_users': 100,
                'max_locations': 20,
                'max_visitors_per_month': 10000,
                'has_api_access': True,
                'has_custom_domain': True,
                'has_sso': True,
                'has_advanced_analytics': True,
                'has_ocr_integration': True,
                'has_gate_automation': True,
                'description': 'Complete solution for large organizations',
                'features': ['Everything in Professional', 'Custom domain', 'SSO', 'OCR integration', 'Gate automation']
            }
        ]

        for plan_data in plans_data:
            plan, created = SubscriptionPlan.objects.get_or_create(
                slug=plan_data['slug'],
                defaults=plan_data
            )
            if created:
                self.stdout.write(f"  Created plan: {plan.name}")

    def create_tenant_with_data(self, tenant_num, users_per_tenant, locations_per_tenant, hosts_per_location, visitors_per_day, days):
        """Create a complete tenant with all related data."""
        tenant_name = f"Company {tenant_num}"
        subdomain = f"company{tenant_num}"
        
        # Ensure unique subdomain
        counter = 1
        original_subdomain = subdomain
        while Tenant.objects.filter(subdomain=subdomain).exists():
            subdomain = f"{original_subdomain}-{counter}"
            counter += 1
        
        # Ensure unique slug
        slug = f"{tenant_name.lower().replace(' ', '-')}"
        counter = 1
        original_slug = slug
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        # Determine tier based on tenant number
        tiers = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']
        tier = tiers[(tenant_num - 1) % len(tiers)]
        
        # Create tenant
        tenant = Tenant.objects.create(
            name=tenant_name,
            slug=slug,
            subdomain=subdomain,
            tier=tier,
            billing_email=f"billing@{subdomain}.com",
            trial_ends_at=timezone.now() + timedelta(days=30) if tier == 'STARTER' else None,
            subscription_ends_at=timezone.now() + timedelta(days=365)
        )
        
        # Get the appropriate plan
        plan = SubscriptionPlan.objects.get(tier=tier)
        
        # Create subscription
        subscription = Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )
        
        # Update tenant limits from plan
        tenant.max_users = plan.max_users
        tenant.max_locations = plan.max_locations
        tenant.max_visitors_per_month = plan.max_visitors_per_month
        tenant.save()
        
        # Create tenant settings
        TenantSettings.objects.create(
            tenant=tenant,
            primary_color=self.random_color(),
            working_days=[0, 1, 2, 3, 4],  # Monday to Friday
            gate_automation_enabled=tier == 'ENTERPRISE',
            rtsp_camera_url=f"rtsp://camera.{subdomain}.com/stream" if tier == 'ENTERPRISE' else ""
        )
        
        self.stdout.write(f"  Created tenant: {tenant.name} ({tier})")
        
        # Create owner user
        owner_user = self.create_user(f"owner{tenant_num}", f"owner{tenant_num}@{subdomain}.com", is_owner=True)
        tenant.owner = owner_user
        tenant.save()
        
        # Create tenant user relationship
        TenantUser.objects.create(
            tenant=tenant,
            user=owner_user,
            role='OWNER'
        )
        
        # Create additional users
        users = [owner_user]
        for i in range(users_per_tenant - 1):
            user = self.create_user(f"user{tenant_num}_{i}", f"user{tenant_num}_{i}@{subdomain}.com")
            users.append(user)
            
            # Assign roles
            roles = ['ADMIN', 'MANAGER', 'HOST', 'HOST', 'HOST', 'RECEPTIONIST']
            role = roles[i % len(roles)]
            
            TenantUser.objects.create(
                tenant=tenant,
                user=user,
                role=role
            )
        
        # Create locations
        locations = []
        for i in range(locations_per_tenant):
            location = Location.objects.create(
                tenant=tenant,
                name=f"Office {i + 1}",
                address=f"{i + 1} Business Street, City {tenant_num}",
                floor=f"Floor {i + 1}",
                require_nda=random.choice([True, False]),
                require_visitor_approval=tier == 'ENTERPRISE' and random.choice([True, False])
            )
            locations.append(location)
        
        # Create kiosks
        kiosks = []
        for location in locations:
            for i in range(random.randint(1, 3)):
                kiosk = Kiosk.objects.create(
                    tenant=tenant,
                    name=f"Kiosk {location.name} {i + 1}",
                    location=location
                )
                kiosks.append(kiosk)
        
        # Create hosts
        hosts = []
        for location in locations:
            for i in range(hosts_per_location):
                # Find a user without a host profile
                available_users = [u for u in users if not hasattr(u, 'host_profile')]
                user = random.choice(available_users) if available_users else None
                
                host = Host.objects.create(
                    tenant=tenant,
                    name=f"Host {location.name} {i + 1}",
                    email=f"host{location.name.lower().replace(' ', '')}{i + 1}@{subdomain}.com",
                    department=random.choice(['Engineering', 'Sales', 'Marketing', 'HR', 'Finance']),
                    phone=f"+1{random.randint(2000000000, 9999999999)}",
                    location=location,
                    user=user,
                    receive_notifications=random.choice([True, False])
                )
                hosts.append(host)
        
        # Generate visitor data for past days
        visitors = []
        pre_registrations = []
        
        for day_offset in range(days):
            date = timezone.now().date() - timedelta(days=day_offset)
            
            # Generate visitors for this day
            day_visitors = self.generate_day_visitors(
                tenant=tenant,
                date=date,
                count=visitors_per_day,
                locations=locations,
                hosts=hosts,
                kiosks=kiosks
            )
            visitors.extend(day_visitors)
        
        # Generate some pre-registrations for future dates
        for day_offset in range(7):
            date = timezone.now().date() + timedelta(days=day_offset + 1)
            day_pre_regs = self.generate_pre_registrations(
                tenant=tenant,
                date=date,
                count=random.randint(5, 15),
                locations=locations,
                hosts=hosts
            )
            pre_registrations.extend(day_pre_regs)
        
        self.stdout.write(f"    - {len(locations)} locations")
        self.stdout.write(f"    - {len(kiosks)} kiosks")
        self.stdout.write(f"    - {len(hosts)} hosts")
        self.stdout.write(f"    - {len(visitors)} visitors (past {days} days)")
        self.stdout.write(f"    - {len(pre_registrations)} pre-registrations (upcoming)")

    def create_user(self, username, email, is_owner=False):
        """Create a user with profile."""
        # Ensure unique username
        counter = 1
        original_username = username
        while User.objects.filter(username=username).exists():
            username = f"{original_username}_{counter}"
            counter += 1
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=os.environ.get('SEED_USER_PASSWORD', 'changeme123!'),
            first_name=username.title(),
            last_name='Test'
        )
        return user

    def generate_day_visitors(self, tenant, date, count, locations, hosts, kiosks):
        """Generate visitors for a specific day."""
        visitors = []
        
        for i in range(count):
            # Random check-in time during business hours
            hour = random.randint(8, 17)
            minute = random.randint(0, 59)
            checkin_time = timezone.make_aware(
                datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
            )
            
            # Random checkout time (2-4 hours later)
            checkout_hours = random.uniform(2, 4)
            checkout_time = checkin_time + timedelta(hours=checkout_hours)
            
            # Random status (80% checked out, 20% still checked in)
            status = 'CHECKED_OUT' if random.random() < 0.8 else 'CHECKED_IN'
            
            # Create visitor
            visitor = Visitor.objects.create(
                tenant=tenant,
                name=self.random_name(),
                email=self.random_email(),
                phone=f"+1{random.randint(2000000000, 9999999999)}",
                company=random.choice(['Acme Corp', 'Tech Solutions', 'Global Industries', 'Local Business']),
                number_plate=self.random_number_plate() if random.random() < 0.6 else '',
                host=random.choice(hosts),
                location=random.choice(locations),
                kiosk=random.choice(kiosks) if random.random() < 0.7 else None,
                purpose=random.choice(['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Consultation']),
                status=status,
                checkin_time=checkin_time,
                checkout_time=checkout_time if status == 'CHECKED_OUT' else None,
                expected_duration=random.randint(30, 240),  # 30 mins to 4 hours
                badge_number=f"B{random.randint(1000, 9999)}",
                nda_accepted=random.choice([True, False]),
                nda_signed_at=checkin_time if random.random() < 0.3 else None
            )
            visitors.append(visitor)
        
        return visitors

    def generate_pre_registrations(self, tenant, date, count, locations, hosts):
        """Generate pre-registrations for future dates."""
        pre_regs = []
        
        for i in range(count):
            # Random expected arrival time
            hour = random.randint(9, 16)
            minute = random.randint(0, 59)
            expected_arrival = timezone.make_aware(
                datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute))
            )
            
            pre_reg = PreRegistration.objects.create(
                tenant=tenant,
                visitor_name=self.random_name(),
                visitor_email=self.random_email(),
                visitor_phone=f"+1{random.randint(2000000000, 9999999999)}",
                visitor_company=random.choice(['Acme Corp', 'Tech Solutions', 'Global Industries']),
                visitor_number_plate=self.random_number_plate() if random.random() < 0.7 else '',
                host=random.choice(hosts),
                location=random.choice(locations),
                expected_arrival=expected_arrival
            )
            pre_regs.append(pre_reg)
        
        return pre_regs

    def random_name(self):
        """Generate a random name."""
        first_names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
        return f"{random.choice(first_names)} {random.choice(last_names)}"

    def random_email(self):
        """Generate a random email."""
        domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'test.com']
        name = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=8))
        return f"{name}@{random.choice(domains)}"

    def random_number_plate(self):
        """Generate a random number plate."""
        formats = [
            f"{random.choice('ABCDEF')}{random.randint(100, 999)}",
            f"{random.randint(1000, 9999)}{random.choice('ABCDEF')}",
            f"{random.choice('ABC')}-{random.randint(100, 999)}-{random.choice('XYZ')}"
        ]
        return random.choice(formats)

    def random_color(self):
        """Generate a random hex color."""
        return f"#{random.randint(0, 0xFFFFFF):06x}"
