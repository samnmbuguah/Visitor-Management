import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
from visitors.models import (
    Location, Host, Kiosk, Visitor, PreRegistration, UserProfile
)
from visitors.tenant_models import (
    Tenant, TenantUser, SubscriptionPlan, Subscription, TenantSettings
)
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed tenant-isolated test data for kiosk host notification testing'

    def add_arguments(self, parser):
        parser.add_argument('--tenant-name', type=str, default='Test Company', help='Company name')
        parser.add_argument('--cleanup', action='store_true', help='Clean existing data first')

    def handle(self, *args, **options):
        tenant_name = options['tenant_name']
        cleanup = options['cleanup']

        if cleanup:
            self.stdout.write('Cleaning existing test data...')
            self.cleanup_test_data()

        self.stdout.write(f"Creating tenant-isolated test data for '{tenant_name}'...")
        self.create_tenant_isolated_setup(tenant_name)
        self.stdout.write(self.style.SUCCESS(f"Successfully created tenant-isolated setup for '{tenant_name}'!"))

    def cleanup_test_data(self):
        """Clean up existing test data while preserving core system data."""
        # Only delete test tenants (those with 'Test' in name)
        test_tenants = Tenant.objects.filter(name__contains='Test')
        for tenant in test_tenants:
            self.stdout.write(f"  Deleting test tenant: {tenant.name}")
            tenant.delete()

    def create_tenant_isolated_setup(self, tenant_name):
        """Create a complete tenant-isolated setup for testing."""
        
        # Create subscription plan
        plan, created = SubscriptionPlan.objects.get_or_create(
            slug='test-plan',
            defaults={
                'name': 'Test Plan',
                'tier': 'PROFESSIONAL',
                'monthly_price': 0.00,
                'yearly_price': 0.00,
                'max_users': 50,
                'max_locations': 10,
                'max_visitors_per_month': 1000,
                'has_api_access': True,
                'has_custom_domain': False,
                'has_sso': False,
                'has_advanced_analytics': True,
                'has_ocr_integration': True,
                'has_gate_automation': True,
                'description': 'Test plan for development',
                'features': ['All features enabled for testing']
            }
        )
        if created:
            self.stdout.write(f"  Created test plan: {plan.name}")

        # Create unique tenant
        subdomain = tenant_name.lower().replace(' ', '').replace('test', '') + str(random.randint(100, 999))
        slug = f"{tenant_name.lower().replace(' ', '-')}-{subdomain}"
        
        # Ensure uniqueness
        counter = 1
        original_subdomain = subdomain
        while Tenant.objects.filter(subdomain=subdomain).exists():
            subdomain = f"{original_subdomain}-{counter}"
            counter += 1

        tenant = Tenant.objects.create(
            name=tenant_name,
            slug=slug,
            subdomain=subdomain,
            tier='PROFESSIONAL',
            billing_email=f"billing@{subdomain}.com",
            trial_ends_at=None,
            subscription_ends_at=timezone.now() + timedelta(days=365)
        )
        
        # Update tenant limits from plan
        tenant.max_users = plan.max_users
        tenant.max_locations = plan.max_locations
        tenant.max_visitors_per_month = plan.max_visitors_per_month
        tenant.save()
        
        # Create subscription
        subscription = Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30)
        )
        
        # Create tenant settings
        settings = TenantSettings.objects.create(
            tenant=tenant,
            primary_color=self.random_color(),
            working_days=[0, 1, 2, 3, 4],  # Monday to Friday
            gate_automation_enabled=True,
            rtsp_camera_url=f"rtsp://camera.{subdomain}.com/stream",
            email_notifications_enabled=True,
            sms_notifications_enabled=True,
            enable_pre_registration=True,
            enable_walk_ins=True,
            enable_overstay_alerts=True
        )
        
        self.stdout.write(f"  Created tenant: {tenant.name} ({tenant.tier})")
        
        # Create users with proper tenant relationships
        users = self.create_tenant_users(tenant, tenant_name)
        
        # Create locations
        locations = self.create_locations(tenant)
        
        # Create kiosks
        kiosks = self.create_kiosks(tenant, locations)
        
        # Create hosts and link to users
        hosts = self.create_hosts(tenant, locations, users)
        
        # Create some test visitors
        visitors = self.create_test_visitors(tenant, hosts, locations, kiosks)
        
        # Create pre-registrations
        pre_regs = self.create_pre_registrations(tenant, hosts, locations)
        
        self.stdout.write(f"    - {len(locations)} locations")
        self.stdout.write(f"    - {len(kiosks)} kiosks")
        self.stdout.write(f"    - {len(hosts)} hosts")
        self.stdout.write(f"    - {len(visitors)} test visitors")
        self.stdout.write(f"    - {len(pre_regs)} pre-registrations")

    def create_tenant_users(self, tenant, tenant_name):
        """Create users with proper tenant relationships."""
        users = []
        
        # Owner
        owner_user_data = self.create_user_with_profile(f"{tenant_name} Owner", f"owner@{tenant.subdomain}.com", 'OWNER', tenant)
        users.append(owner_user_data)
        tenant.owner = owner_user_data['user']
        
        # Admin
        admin_user = self.create_user_with_profile(f"{tenant_name} Admin", f"admin@{tenant.subdomain}.com", 'ADMIN', tenant)
        users.append(admin_user)
        
        # Manager
        manager_user = self.create_user_with_profile(f"{tenant_name} Manager", f"manager@{tenant.subdomain}.com", 'MANAGER', tenant)
        users.append(manager_user)
        
        # Multiple hosts for testing
        for i in range(3):
            host_user = self.create_user_with_profile(f"{tenant.name} Host {i+1}", f"host{i+1}@{tenant.subdomain}.com", 'HOST', tenant)
            users.append(host_user)
        
        # Kiosk user
        reception_user = self.create_user_with_profile(f"{tenant.name} Reception", f"reception@{tenant.subdomain}.com", 'RECEPTIONIST', tenant)
        users.append(reception_user)
        
        return users

    def create_user_with_profile(self, name, email, role, tenant):
        """Create user with UserProfile and TenantUser relationship."""
        # Ensure unique username
        username = email.split('@')[0]
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{username}_{counter}"
            counter += 1
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=os.environ.get('SEED_USER_PASSWORD', 'test123!'),
            first_name=name.split()[0],
            last_name=name.split()[-1] if len(name.split()) > 1 else '',
            is_active=True
        )
        
        # Create UserProfile
        profile = UserProfile.objects.create(
            user=user,
            role=role
        )
        
        # Create TenantUser relationship
        tenant_user = TenantUser.objects.create(
            tenant=tenant,
            user=user,
            role=role
        )
        
        self.stdout.write(f"    Created user: {username} ({role})")
        return {'user': user, 'profile': profile, 'tenant_user': tenant_user}

    def create_locations(self, tenant):
        """Create locations for the tenant."""
        locations = []
        
        for i in range(2):
            location = Location.objects.create(
                tenant=tenant,
                name=f"Office {i+1}",
                address=f"{i+1} Test Street, {tenant.name} City",
                floor=f"Floor {i+1}",
                require_nda=i == 0,  # First location requires NDA
                require_visitor_approval=True,
                is_active=True
            )
            locations.append(location)
            
        return locations

    def create_kiosks(self, tenant, locations):
        """Create kiosks for the tenant."""
        kiosks = []
        
        for i, location in enumerate(locations):
            kiosk = Kiosk.objects.create(
                tenant=tenant,
                name=f"Kiosk {location.name}",
                location=location,
                is_active=True
            )
            kiosks.append(kiosk)
            
        return kiosks

    def create_hosts(self, tenant, locations, users):
        """Create hosts and link to users."""
        hosts = []
        host_users = [u for u in users if u['profile'].role == 'HOST']
        
        for i, (location, user_data) in enumerate(zip(locations, host_users)):
            host = Host.objects.create(
                tenant=tenant,
                name=f"{user_data['user'].first_name} {user_data['user'].last_name}",
                email=user_data['user'].email,
                department=random.choice(['Engineering', 'Sales', 'Marketing', 'HR', 'Finance']),
                phone=f"+1{random.randint(2000000000, 9999999999)}",
                location=location,
                user=user_data['user'],
                receive_notifications=True
            )
            hosts.append(host)
            
        return hosts

    def create_test_visitors(self, tenant, hosts, locations, kiosks):
        """Create some test visitors for immediate testing."""
        visitors = []
        
        for i in range(5):
            # Random check-in time in the last hour
            checkin_time = timezone.now() - timedelta(minutes=random.randint(5, 60))
            
            visitor = Visitor.objects.create(
                tenant=tenant,
                name=self.random_name(),
                email=self.random_email(),
                phone=f"+1{random.randint(2000000000, 9999999999)}",
                company=random.choice(['Acme Corp', 'Tech Solutions', 'Global Industries']),
                host=random.choice(hosts),
                location=random.choice(locations),
                kiosk=random.choice(kiosks),
                purpose=random.choice(['Meeting', 'Interview', 'Delivery', 'Maintenance']),
                status='CHECKED_IN',
                checkin_time=checkin_time,
                expected_duration=random.randint(30, 120),
                badge_number=f"B{random.randint(1000, 9999)}",
                nda_accepted=random.choice([True, False]),
                nda_signed_at=checkin_time if random.choice([True, False]) else None
            )
            visitors.append(visitor)
            
        return visitors

    def create_pre_registrations(self, tenant, hosts, locations):
        """Create pre-registrations for future dates."""
        pre_regs = []
        
        for i in range(3):
            # Future arrival time
            expected_arrival = timezone.now() + timedelta(days=i+1, hours=10)
            
            pre_reg = PreRegistration.objects.create(
                tenant=tenant,
                visitor_name=self.random_name(),
                visitor_email=self.random_email(),
                visitor_phone=f"+1{random.randint(2000000000, 9999999999)}",
                visitor_company=random.choice(['Acme Corp', 'Tech Solutions']),
                host=random.choice(hosts),
                location=random.choice(locations),
                expected_arrival=expected_arrival,
                status='PENDING'
            )
            pre_regs.append(pre_reg)
            
        return pre_regs

    def random_name(self):
        """Generate a random name."""
        first_names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller']
        return f"{random.choice(first_names)} {random.choice(last_names)}"

    def random_email(self):
        """Generate a random email."""
        domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'test.com']
        name = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=8))
        return f"{name}@{random.choice(domains)}"

    def random_color(self):
        """Generate a random hex color."""
        return f"#{random.randint(0, 0xFFFFFF):06x}"
