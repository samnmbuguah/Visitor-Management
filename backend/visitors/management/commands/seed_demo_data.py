import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
import uuid

from visitors.models import (
    Location, Host, Kiosk, Visitor, PreRegistration,
    VisitorType, UserProfile, UserRole, NotificationTemplate,
    WatchlistEntry, Parcel
)
from visitors.tenant_models import (
    Tenant, TenantUser, SubscriptionPlan, Subscription, TenantSettings
)
from django.core.management import call_command

# Optional Advanced Models
try:
    from visitors.security_models import GateAccessLog, SecurityIncident, SecurityAlert, CameraStatus, VisitorTracking
    HAS_SECURITY = True
except ImportError:
    HAS_SECURITY = False

User = get_user_model()

class Command(BaseCommand):
    help = 'Wipe existing data and seed a comprehensive, pristine demo environment for Acme Corp'

    def add_arguments(self, parser):
        parser.add_argument('--clean', action='store_true', help='Wipe existing data before seeding')

    def handle(self, *args, **options):
        if options['clean']:
            self.stdout.write("Cleaning existing demo and test data...")
            self.clean_data()

        self.stdout.write("Seeding comprehensive Acme Corp Demo Data...")
        self.create_subscription_plans()
        self.create_visitor_types()

        # Create the primary Acme Corp Demo Tenant
        tenant, locations, hosts, kiosks = self.create_acme_tenant()
        
        # Populate operational data
        self.seed_visitors_and_invites(tenant, locations, hosts, kiosks)
        self.seed_watchlist_and_parcels(tenant, locations, hosts)
        
        # Seed Property Management data for the demo tenant
        self.stdout.write("Seeding Property Management data...")
        call_command('seed_property_management_data', tenants=1, locations=2, requests=10)
        
        # Populate advanced modules
        if HAS_SECURITY:
            self.seed_security_dashboard(tenant, locations)

        password = os.environ.get('DEMO_SEED_PASSWORD', 'fallback123!')
        
        self.stdout.write(self.style.SUCCESS("Demo database successfully seeded!"))
        self.stdout.write("\n--- DEMO CREDENTIALS ---")
        self.stdout.write(f"Password for all users: {password}")
        self.stdout.write("Super Admin: superadmin@system.local")
        self.stdout.write("Tenant Owner: owner@acmecorp.com")
        self.stdout.write("Tenant Admin: admin@acmecorp.com")
        self.stdout.write("Receptionist: receptionist@acmecorp.com")
        self.stdout.write("Host (Employee): host@acmecorp.com")
        self.stdout.write("Host (Dwight): dwight@acmecorp.com")
        self.stdout.write("Kiosk Account: kiosk@acmecorp.com")

    def clean_data(self):
        """Wipe all tenants and users (except superusers if desired, but we'll recreate)."""
        Tenant.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        SubscriptionPlan.objects.all().delete()
        VisitorType.objects.all().delete()

    def create_subscription_plans(self):
        plans_data = [
            {'name': 'Starter', 'slug': 'starter', 'tier': 'STARTER', 'monthly_price': 29.99, 'yearly_price': 299.99, 'max_users': 5, 'max_locations': 1, 'max_visitors_per_month': 100},
            {'name': 'Professional', 'slug': 'professional', 'tier': 'PROFESSIONAL', 'monthly_price': 99.99, 'yearly_price': 999.99, 'max_users': 25, 'max_locations': 5, 'max_visitors_per_month': 1000},
            {'name': 'Enterprise', 'slug': 'enterprise', 'tier': 'ENTERPRISE', 'monthly_price': 299.99, 'yearly_price': 2999.99, 'max_users': 100, 'max_locations': 20, 'max_visitors_per_month': 10000, 'has_api_access': True, 'has_custom_domain': True, 'has_sso': True, 'has_advanced_analytics': True, 'has_ocr_integration': True, 'has_gate_automation': True}
        ]
        for data in plans_data:
            SubscriptionPlan.objects.get_or_create(slug=data['slug'], defaults=data)

    def create_visitor_types(self):
        types = ["Meeting", "Interview", "Delivery", "Contractor", "Maintenance", "Personal"]
        for t in types:
            VisitorType.objects.get_or_create(name=t, defaults={'description': f'Standard {t.lower()} visit.'})

    def create_acme_tenant(self):
        # 1. Tenant Creation
        tenant, _ = Tenant.objects.get_or_create(
            subdomain="acme",
            defaults={
                'name': "Acme Corp",
                'slug': "acme-corp",
                'tier': "ENTERPRISE",
                'billing_email': "billing@acmecorp.com",
                'subscription_ends_at': timezone.now() + timedelta(days=365)
            }
        )
        plan = SubscriptionPlan.objects.get(tier="ENTERPRISE")
        tenant.max_users = plan.max_users
        tenant.max_locations = plan.max_locations
        tenant.max_visitors_per_month = plan.max_visitors_per_month
        tenant.save()

        Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={'plan': plan, 'current_period_start': timezone.now(), 'current_period_end': timezone.now() + timedelta(days=365)}
        )
        
        TenantSettings.objects.get_or_create(
            tenant=tenant,
            defaults={
                'primary_color': "#0052CC",
                'gate_automation_enabled': True,
                'rtsp_camera_url': "rtsp://camera.acmecorp.com/stream",
                'enable_pre_registration': True,
                'enable_walk_ins': True
            }
        )

        # 2. Users & Roles
        password = os.environ.get('DEMO_SEED_PASSWORD', 'fallback123!')
        system_admin, _ = User.objects.get_or_create(username="superadmin", defaults={'email': "superadmin@system.local", 'first_name': "Super", 'last_name': "Admin", 'is_superuser': True, 'is_staff': True})
        if _: system_admin.set_password(password); system_admin.save()
        UserProfile.objects.get_or_create(user=system_admin, defaults={'role': UserRole.SUPER_ADMIN})

        users_spec = [
            ("owner", "Sarah", "Connor", "OWNER"),
            ("admin", "Miles", "Dyson", "ADMIN"),
            ("manager", "John", "Smith", "MANAGER"),
            ("receptionist", "Pam", "Beesly", "RECEPTIONIST"),
            ("host", "Jim", "Halpert", "HOST"),
            ("dwight", "Dwight", "Schrute", "HOST"),
            ("kiosk", "Lobby", "Kiosk", "KIOSK")
        ]

        created_users = {}
        for username, fname, lname, role in users_spec:
            email = f"{username}@acmecorp.com"
            u, created = User.objects.get_or_create(username=username, defaults={'email': email, 'first_name': fname, 'last_name': lname})
            if created:
                u.set_password(password)
                u.save()
            
            # Map role string to choices
            profile_role = getattr(UserRole, role, UserRole.HOST) if hasattr(UserRole, role) else UserRole.HOST

            UserProfile.objects.get_or_create(user=u, defaults={'role': profile_role})
            TenantUser.objects.get_or_create(tenant=tenant, user=u, defaults={'role': role})
            created_users[username] = u

        tenant.owner = created_users["owner"]
        tenant.save()

        # 3. Locations
        loc_hq, _ = Location.objects.get_or_create(tenant=tenant, name="Global Headquarters", defaults={'address': "123 Innovation Drive", 'floor': "Lobby", 'require_nda': True, 'require_visitor_approval': True})
        loc_lab, _ = Location.objects.get_or_create(tenant=tenant, name="R&D Laboratory", defaults={'address': "456 Science Park", 'require_nda': True, 'require_visitor_approval': True})
        locations = [loc_hq, loc_lab]

        # 4. Kiosks
        kiosk_main, _ = Kiosk.objects.get_or_create(tenant=tenant, name="Main Entrance Kiosk", defaults={'location': loc_hq})
        kiosks = [kiosk_main]
        
        # Assign location to kiosk user profile
        kiosk_profile = created_users["kiosk"].profile
        kiosk_profile.location = loc_hq
        kiosk_profile.save()

        # 5. Hosts
        host_profile, _ = Host.objects.get_or_create(
            tenant=tenant, email=created_users["host"].email,
            defaults={'name': "Jim Halpert", 'department': "Sales", 'phone': "+15550100", 'location': loc_hq, 'user': created_users["host"]}
        )
        
        # Second host profile
        host_dwight, _ = Host.objects.get_or_create(
            tenant=tenant, email=created_users["dwight"].email,
            defaults={'name': "Dwight Schrute", 'department': "Sales", 'phone': "+15550101", 'location': loc_hq, 'user': created_users["dwight"]}
        )
        
        hosts = [host_profile, host_dwight]

        return tenant, locations, hosts, kiosks

    def seed_visitors_and_invites(self, tenant, locations, hosts, kiosks):
        now = timezone.now()
        v_types = list(VisitorType.objects.all())
        
        # 1. Past Visitors (Checked out)
        for i in range(15):
            checkin = now - timedelta(days=random.randint(1, 10), hours=random.randint(2, 8))
            checkout = checkin + timedelta(hours=random.randint(1, 4))
            Visitor.objects.create(
                tenant=tenant, name=f"Past Visitor {i}", email=f"past{i}@example.com", phone="555-0000",
                company="Visitor Co", host=random.choice(hosts), location=random.choice(locations), kiosk=random.choice(kiosks) if i%2==0 else None,
                visitor_type=random.choice(v_types), status='CHECKED_OUT', checkin_time=checkin, checkout_time=checkout, nda_accepted=True
            )

        # 2. Active Visitors (Checked in)
        for i in range(3):
            checkin = now - timedelta(minutes=random.randint(10, 120))
            Visitor.objects.create(
                tenant=tenant, name=f"Active Visitor {i}", email=f"active{i}@example.com", phone="555-1111",
                company="Active Co", host=hosts[0], location=locations[0], kiosk=kiosks[0],
                visitor_type=v_types[0], status='CHECKED_IN', checkin_time=checkin, expected_duration=120, nda_accepted=True
            )

        # 3. Pending Approvals
        Visitor.objects.create(
            tenant=tenant, name="Waitlist Wendy", email="wendy@example.com", phone="555-2222",
            company="Wait LLC", host=hosts[0], location=locations[0], kiosk=kiosks[0],
            visitor_type=v_types[1], status='PENDING', checkin_time=now - timedelta(minutes=5)
        )

        # 4. Pre-Registrations (Upcoming)
        for i in range(5):
            arrival = now + timedelta(days=random.randint(1, 5), hours=random.randint(9, 15))
            PreRegistration.objects.create(
                tenant=tenant, visitor_name=f"Expected Guest {i}", visitor_email=f"guest{i}@example.com",
                visitor_company="Future Inc", visitor_type=random.choice(v_types), host=random.choice(hosts),
                location=random.choice(locations), expected_arrival=arrival, status='PENDING'
            )

    def seed_watchlist_and_parcels(self, tenant, locations, hosts):
        # Watchlist
        WatchlistEntry.objects.get_or_create(email="banned@example.com", defaults={'name': "Banned Person", 'match_type': 'EXACT', 'reason': "Aggressive behavior", 'location': locations[0]})
        WatchlistEntry.objects.get_or_create(name="Suspicious Sam", defaults={'match_type': 'CONTAINS', 'reason': "Known competitor operative"})

        # Parcels
        Parcel.objects.get_or_create(recipient=hosts[0], location=locations[0], defaults={'courier': "FedEx", 'tracking_number': "123456789", 'status': 'RECEIVED'})
        Parcel.objects.get_or_create(recipient=hosts[1], location=locations[0], defaults={'courier': "UPS", 'tracking_number': "987654321", 'status': 'COLLECTED', 'collected_at': timezone.now() - timedelta(hours=2)})

    def seed_security_dashboard(self, tenant, locations):
        # Cameras
        cam_gate, _ = CameraStatus.objects.get_or_create(tenant=tenant, name="Main Gate LPR", defaults={'location': locations[0], 'rtsp_url': "rtsp://camera.acmecorp.com/gate", 'camera_type': 'gate', 'status': 'ONLINE', 'is_monitoring': True, 'total_detections': 1420})
        cam_lobby, _ = CameraStatus.objects.get_or_create(tenant=tenant, name="Lobby Overlook", defaults={'location': locations[0], 'rtsp_url': "rtsp://camera.acmecorp.com/lobby", 'camera_type': 'entrance', 'status': 'ONLINE', 'is_monitoring': True})
        
        now = timezone.now()

        # Gate Logs
        GateAccessLog.objects.create(tenant=tenant, plate_number="ABC-1234", access_type='pre_registered', access_granted=True, confidence_score=0.98, detected_at=now - timedelta(minutes=45))
        GateAccessLog.objects.create(tenant=tenant, plate_number="UNKNOWN-1", access_type='unknown', access_granted=False, confidence_score=0.45, detected_at=now - timedelta(hours=2))

        # Security Incidents
        incident, _ = SecurityIncident.objects.get_or_create(tenant=tenant, title="Tailgating at Main Gate", defaults={'description': "Secondary vehicle followed authorized vehicle ABC-1234 closely.", 'incident_type': 'tailgating', 'severity': 'MEDIUM', 'status': 'INVESTIGATING', 'location': locations[0], 'detected_at': now - timedelta(hours=24)})
        
        # Alerts
        SecurityAlert.objects.create(tenant=tenant, alert_type='unrecognized_plate', message="Unrecognized plate UNKNOWN-1 detected at Main Gate", severity='LOW', related_incident=None, is_active=True, created_at=now - timedelta(hours=2))
        SecurityAlert.objects.create(tenant=tenant, alert_type='multiple_attempts', message="Multiple denied access attempts at R&D Lab", severity='HIGH', is_active=True, created_at=now - timedelta(minutes=15))
