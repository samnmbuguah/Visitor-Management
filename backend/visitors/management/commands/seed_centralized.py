import os, random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from visitors.models import (
    Location, Host, Kiosk, Visitor, PreRegistration,
    Parcel, WatchlistEntry, NotificationTemplate, UserProfile
)
from visitors.tenant_models import (
    Tenant, TenantUser, SubscriptionPlan, Subscription, TenantSettings
)
from property_management.models import (
    Asset, AssetType, MaintenanceRequest, MaintenanceCategory,
    WorkOrder, Vendor, CostCenter, Lease, MaintenanceExpense,
    AssetCheckout, MaintenanceSchedule
)

User = get_user_model()
PASSWORD = os.environ.get('SEED_USER_PASSWORD', 'changeme123!')

FIRST_NAMES = ['John','Jane','Michael','Sarah','David','Emily','Robert','Lisa','James','Mary',
               'Chris','Amanda','Kevin','Jessica','Brian','Ashley','Justin','Megan','Tyler','Nicole']
LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez']
PURPOSES = ['Meeting','Interview','Delivery','Maintenance','Consultation','Training']
COMPANIES = ['Acme Corp','Tech Solutions','Global Industries','Local Business','Innovate Inc']
COURIERS = ['DHL','FedEx','UPS','USPS','Amazon Logistics']
DEPARTMENTS = ['Engineering','Sales','Marketing','HR','Finance','Operations']
TIERS = ['STARTER','PROFESSIONAL','ENTERPRISE']

ASSET_TYPES_POOL = ['Air Conditioner','Heating Unit','Electrical Panel','Elevator','Fire Alarm',
                    'Security Camera','Server','Printer','Coffee Machine','Water Heater']
CATEGORIES_POOL = ['HVAC','Electrical','Plumbing','Elevator','Fire Safety','Security','Cleaning','Landscaping','IT Equipment','Appliances']

TENANT_CONFIG = [
    {'name': 'Alpha Corp',   'slug': 'alpha-corp',   'tier': 'STARTER'},
    {'name': 'Beta Inc',     'slug': 'beta-inc',     'tier': 'PROFESSIONAL'},
    {'name': 'Gamma Ltd',    'slug': 'gamma-ltd',    'tier': 'ENTERPRISE'},
]

LOCATION_NAMES = ['Main Office', 'Branch Office', 'Warehouse', 'Conference Center', 'Data Center']


class Command(BaseCommand):
    help = 'Seed comprehensive demo data with clean usernames'

    def handle(self, *args, **options):
        self._clear_all()
        self._create_plans()
        self._create_global_users()
        for cfg in TENANT_CONFIG:
            self._create_tenant(cfg)
        self._seed_global_models()
        self._print_summary()

    def _clear_all(self):
        models = [Lease, AssetCheckout, Asset, AssetType, MaintenanceSchedule, MaintenanceExpense,
                  WorkOrder, MaintenanceRequest, MaintenanceCategory, Vendor, CostCenter,
                  PreRegistration, Visitor, Parcel, WatchlistEntry, NotificationTemplate,
                  Kiosk, Host, TenantUser, TenantSettings, Subscription, SubscriptionPlan,
                  UserProfile, Location, Tenant]
        for m in models:
            m.objects.all().delete()
        # Keep only superuser created by migration (if any)
        for u in User.objects.filter(is_superuser=False):
            u.delete()

    def _create_plans(self):
        plans = [
            {'name': 'Starter', 'slug': 'starter', 'tier': 'STARTER', 'monthly_price': 29.99, 'yearly_price': 299.99,
             'max_users': 5, 'max_locations': 1, 'max_visitors_per_month': 100,
             'description': 'Perfect for small offices', 'has_api_access': False, 'has_advanced_analytics': False,
             'features': ['Basic visitor management', 'Email notifications', 'Mobile apps']},
            {'name': 'Professional', 'slug': 'professional', 'tier': 'PROFESSIONAL', 'monthly_price': 99.99, 'yearly_price': 999.99,
             'max_users': 25, 'max_locations': 5, 'max_visitors_per_month': 1000,
             'description': 'Ideal for growing businesses', 'has_api_access': True, 'has_advanced_analytics': True,
             'features': ['Everything in Starter', 'API access', 'Advanced analytics', 'Custom branding']},
            {'name': 'Enterprise', 'slug': 'enterprise', 'tier': 'ENTERPRISE', 'monthly_price': 299.99, 'yearly_price': 2999.99,
             'max_users': 100, 'max_locations': 20, 'max_visitors_per_month': 10000,
             'description': 'Complete solution for large organizations', 'has_api_access': True,
             'has_custom_domain': True, 'has_sso': True, 'has_advanced_analytics': True,
             'has_ocr_integration': True, 'has_gate_automation': True,
             'features': ['Everything in Professional', 'Custom domain', 'SSO', 'OCR', 'Gate automation']},
        ]
        for p in plans:
            SubscriptionPlan.objects.get_or_create(slug=p['slug'], defaults=p)

    def _create_global_users(self):
        u, _ = User.objects.get_or_create(username='admin', defaults={
            'email': 'admin@example.com', 'is_superuser': True, 'is_staff': True})
        u.set_password('admin123')
        u.save()
        UserProfile.objects.get_or_create(user=u, defaults={'role': 'SUPER_ADMIN'})

    def _create_tenant(self, cfg):
        prefix = cfg['slug'].split('-')[0][:2]
        idx = TENANT_CONFIG.index(cfg) + 1

        tenant = Tenant.objects.create(
            name=cfg['name'], slug=cfg['slug'], subdomain=cfg['slug'],
            billing_email=f'billing@{cfg["slug"]}.com', tier=cfg['tier'],
            max_users=50, max_locations=10, max_visitors_per_month=5000,
        )
        plan = SubscriptionPlan.objects.get(tier=cfg['tier'])
        Subscription.objects.create(tenant=tenant, plan=plan,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30))
        TenantSettings.objects.create(tenant=tenant)

        # Create tenant users with clean names
        user_specs = [
            (f'{prefix}admin',      'ADMIN'),
            (f'{prefix}host',       'HOST'),
            (f'{prefix}manager',    'MANAGER'),
            (f'{prefix}reception',  'RECEPTIONIST'),
        ]
        users = []
        for uname, role in user_specs:
            u, created = User.objects.get_or_create(username=uname, defaults={
                'email': f'{uname}@{cfg["slug"]}.com'})
            u.set_password(PASSWORD)
            u.save()
            if not hasattr(u, 'profile'):
                UserProfile.objects.create(user=u, role=role)
            TenantUser.objects.get_or_create(tenant=tenant, user=u, defaults={'role': role})
            users.append((u, role))

        # Link admin superuser to first tenant
        if idx == 1:
            admin = User.objects.get(username='admin')
            TenantUser.objects.get_or_create(tenant=tenant, user=admin, defaults={'role': 'OWNER'})

        # Locations
        n_locs = 2 if cfg['tier'] == 'STARTER' else 3
        chosen_locs = random.sample(LOCATION_NAMES, n_locs)
        locations = []
        for i, loc_name in enumerate(chosen_locs):
            loc = Location.objects.create(
                tenant=tenant, name=loc_name,
                address=f'{i+1} Business St, {cfg["name"]}',
                floor=f'Floor {i+1}',
                require_nda=random.choice([True, False]),
                require_visitor_approval=cfg['tier'] == 'ENTERPRISE' and random.choice([True, False]))
            locations.append(loc)

        # Kiosks per location
        for loc in locations:
            for i in range(random.randint(1, 2)):
                Kiosk.objects.create(tenant=tenant, name=f'{loc.name} Kiosk {i+1}', location=loc)

        # Hosts per location (each user can only be one Host)
        host_users = [u for u, r in users if not hasattr(u, 'host_profile')]
        hosts = []
        for loc in locations:
            for i in range(2):
                if not host_users:
                    break
                user = host_users.pop(0)
                h = Host.objects.create(
                    tenant=tenant, user=user,
                    name=user.username.title(),
                    email=f'{user.username}@{cfg["slug"]}.com',
                    department=random.choice(DEPARTMENTS),
                    location=loc,
                    phone=f'+1{random.randint(200,999)}{random.randint(1000000,9999999)}')
                hosts.append(h)

        # Visitors (past 14 days)
        all_kiosks = list(Kiosk.objects.filter(tenant=tenant))
        for day_offset in range(14):
            date = timezone.now().date() - timedelta(days=day_offset)
            for _ in range(random.randint(5, 10)):
                host = random.choice(hosts)
                hour = random.randint(8, 17)
                checkin = timezone.make_aware(datetime.combine(date, datetime.min.time().replace(hour=hour, minute=random.randint(0, 59))))
                checkout = checkin + timedelta(hours=random.uniform(1, 4))
                Visitor.objects.create(
                    tenant=tenant, name=f'{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}',
                    email=f'{random.choice(FIRST_NAMES).lower()}.{random.choice(LAST_NAMES).lower()}{random.randint(1,999)}@example.com',
                    phone=f'+1{random.randint(200,999)}{random.randint(1000000,9999999)}',
                    company=random.choice(COMPANIES), host=host,
                    location=host.location if random.random() < 0.8 else random.choice(locations),
                    kiosk=random.choice(all_kiosks) if all_kiosks and random.random() < 0.6 else None,
                    purpose=random.choice(PURPOSES),
                    status=random.choice(['CHECKED_OUT', 'CHECKED_OUT', 'CHECKED_IN']),
                    checkin_time=checkin,
                    checkout_time=checkout if random.random() < 0.8 else None,
                    expected_duration=random.randint(30, 240),
                    badge_number=f'B{random.randint(1000,9999)}',
                    nda_accepted=random.choice([True, False]))

        # Pre-registrations (next 7 days)
        for day_offset in range(7):
            date = timezone.now().date() + timedelta(days=day_offset + 1)
            for _ in range(random.randint(3, 8)):
                host = random.choice(hosts)
                hour = random.randint(9, 16)
                arrival = timezone.make_aware(datetime.combine(date, datetime.min.time().replace(hour=hour, minute=random.randint(0, 59))))
                PreRegistration.objects.create(
                    tenant=tenant,
                    visitor_name=f'{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}',
                    visitor_email=f'{random.choice(FIRST_NAMES).lower()}.pre{random.randint(1,999)}@example.com',
                    visitor_phone=f'+1{random.randint(200,999)}{random.randint(1000000,9999999)}',
                    visitor_company=random.choice(COMPANIES),
                    host=host, location=host.location,
                    expected_arrival=arrival,
                    expected_duration=random.randint(30, 240),
                    purpose=random.choice(PURPOSES))

        # Parcels
        for _ in range(10):
            host = random.choice(hosts)
            status = random.choice(['RECEIVED', 'NOTIFIED', 'COLLECTED'])
            Parcel.objects.create(
                recipient=host, location=host.location,
                courier=random.choice(COURIERS),
                tracking_number=f'TRK{random.randint(100000000, 999999999)}',
                status=status,
                signature_required=random.choice([True, False]),
                collected_at=timezone.now() - timedelta(hours=random.randint(1, 48)) if status == 'COLLECTED' else None)

        # Property management data
        cats = []
        for cat_name in random.sample(CATEGORIES_POOL, 4):
            cat, _ = MaintenanceCategory.objects.get_or_create(tenant=tenant, name=cat_name)
            cats.append(cat)
        vendors = []
        for vname in random.sample(['HVAC Pro', 'Electric Inc', 'Plumbing Co', 'Fire Safety', 'Security Plus', 'IT Support'], 3):
            v = Vendor.objects.create(tenant=tenant, name=vname, contact_person='Contact',
                phone=f'+1{random.randint(200,999)}{random.randint(1000000,9999999)}',
                email=f'{vname.lower().replace(" ","")}@{cfg["slug"]}.com')
            v.specialties.add(*random.sample(cats, min(2, len(cats))))
            vendors.append(v)
        for at_name in random.sample(ASSET_TYPES_POOL, 4):
            AssetType.objects.get_or_create(tenant=tenant, name=at_name)
        asset_types = list(AssetType.objects.filter(tenant=tenant))
        cost_centers = []
        for cc_name in ['General Ops', 'IT', 'Facilities', 'Security', 'Admin']:
            code = f'{cfg["slug"][:2]}-{cc_name[:3].upper()}{idx}'
            cc, _ = CostCenter.objects.get_or_create(code=code, tenant=tenant,
                defaults={'name': cc_name})
            cost_centers.append(cc)
        assets = []
        asset_counter = 0
        for loc in locations:
            for _ in range(random.randint(3, 5)):
                asset_counter += 1
                at = random.choice(asset_types)
                a = Asset.objects.create(
                    tenant=tenant, location=loc, asset_type=at,
                    name=f'{at.name} - {loc.name}',
                    qr_code=f'QR-{cfg["slug"][:2]}-{asset_counter}',
                    serial_number=f'SN-{cfg["slug"][:2]}-{asset_counter}',
                    status=random.choice(['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'UNDER_MAINTENANCE']),
                    manufacturer=random.choice(['Honeywell', 'Siemens', 'Schneider', 'Johnson Controls']),
                    purchase_date=timezone.now().date() - timedelta(days=random.randint(100, 1000)),
                    last_maintenance_date=timezone.now().date() - timedelta(days=random.randint(30, 200)),
                    next_maintenance_date=timezone.now().date() + timedelta(days=random.randint(10, 120)))
                assets.append(a)
        requests = []
        for loc in locations:
            for _ in range(random.randint(5, 8)):
                mr = MaintenanceRequest.objects.create(
                    tenant=tenant, location=loc, title=random.choice([
                        'General maintenance', 'AC not cooling', 'Leaky faucet', 'Lights flickering',
                        'Door lock problem', 'Power outlet not working', 'Security camera offline',
                        'Fire alarm test', 'Emergency exit light issue', 'Clogged drain',
                        'Heating system noise', 'Smoke detector issue', 'Water heater issue']),
                    description='Routine maintenance request',
                    category=random.choice(cats),
                    host=random.choice(hosts) if random.random() < 0.5 else None,
                    priority=random.choice(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
                    status=random.choice(['REQUESTED', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED']),
                    assigned_to=random.choice(vendors) if random.random() < 0.5 else None,
                    estimated_cost=random.randint(100, 5000))
                requests.append(mr)
        mr_cycle = iter(requests)
        vendor_cycle = iter(vendors)
        for mr in [r for r in requests if r.status in ('IN_PROGRESS', 'COMPLETED')]:
            v = next(vendor_cycle, random.choice(vendors)) if random.random() < 0.7 else random.choice(vendors)
            wo = WorkOrder.objects.create(
                maintenance_request=mr, vendor=v,
                work_order_number=f'WO-{timezone.now().year}-{random.randint(10000,99999)}',
                instructions=f'Inspect and repair {mr.title.lower()}',
                assigned_technician=random.choice(['John T.', 'Sarah M.', 'Mike R.', 'Lisa K.']),
                estimated_duration_hours=random.uniform(1, 8),
                labor_cost=random.randint(100, 2000),
                material_cost=random.randint(50, 1500))
            cc = random.choice(cost_centers)
            for et in ['LABOR', 'MATERIALS']:
                MaintenanceExpense.objects.create(
                    maintenance_request=mr, cost_center=cc, expense_type=et,
                    description=f'{et.title()} for {mr.title}',
                    amount=random.randint(50, 2000))
            if random.random() < 0.3:
                AssetCheckout.objects.create(
                    asset=random.choice(assets), checked_out_by=random.choice(hosts).user,
                    expected_return_at=timezone.now() + timedelta(days=random.randint(1, 14)),
                    condition_checkout='Good condition')

        # Leases
        for i in range(random.randint(3, 5)):
            start = timezone.now().date() - timedelta(days=random.randint(30, 730))
            end = start + timedelta(days=random.choice([180, 365, 730]))
            status = 'ACTIVE'
            if end < timezone.now().date(): status = 'EXPIRED'
            elif (end - timezone.now().date()).days <= 60: status = 'EXPIRING'
            Lease.objects.create(
                tenant=tenant,
                unit_number=f'{random.choice("ABCDE")}{random.randint(100, 999)}',
                monthly_rent=random.choice([1500, 2000, 2500, 3000, 4500, 6000]),
                start_date=start, end_date=end, status=status)

    def _seed_global_models(self):
        # Notification templates (one per tenant)
        templates_data = [
            ('Visitor Arrival Alert', 'VISITOR_ARRIVAL', 'Your visitor {{visitor_name}} has arrived',
             'Hello {{host_name}},\n\n{{visitor_name}} from {{visitor_company}} has checked in at {{location_name}} on {{checkin_time}}.\n\nPlease proceed to the lobby.'),
            ('Checkout Notification', 'VISITOR_CHECKOUT', '{{visitor_name}} has checked out',
             'Hello {{host_name}},\n\n{{visitor_name}} has checked out at {{checkout_time}}.\nVisit duration: {{duration}}.'),
            ('Pre-Registration Invite', 'PRE_REGISTRATION', 'You are invited to {{location_name}}',
             'Hello {{visitor_name}},\n\nYou have been invited to visit {{location_name}} by {{host_name}} on {{expected_arrival}}.\n\nPlease bring a valid ID.'),
            ('Overstay Alert', 'OVERSTAY_ALERT', 'Overstay alert: {{visitor_name}}',
             'Hello {{host_name}},\n\n{{visitor_name}} has exceeded their expected visit duration at {{location_name}}.\nCheck-in: {{checkin_time}}.'),
            ('Visitor Confirmation', 'VISITOR_CONFIRMATION', 'Visit confirmed for {{location_name}}',
             'Hello {{visitor_name}},\n\nYour visit has been confirmed.\nLocation: {{location_name}}\nHost: {{host_name}}\nDate: {{expected_arrival}}'),
        ]
        for name, typ, subj, body in templates_data:
            for tenant in Tenant.objects.all():
                NotificationTemplate.objects.get_or_create(
                    name=name, type=typ, location__isnull=True,
                    defaults={'subject': subj, 'body': body})

        # Watchlist entries
        entries = [
            ('John Banned', 'banned@example.com', 'EXACT', 'Previous security incident'),
            ('', 'threat@malicious.com', 'EXACT', 'Email associated with phishing'),
            ('Former Employee', 'former@company.com', 'EXACT', 'Access revoked'),
            ('Suspicious Person', '', 'CONTAINS', 'Flagged for tailgating'),
        ]
        for name, email, match_type, reason in entries:
            WatchlistEntry.objects.get_or_create(
                name=name, email=email, reason=reason,
                defaults={'match_type': match_type})

    def _print_summary(self):
        counts = [
            ('Tenant', Tenant.objects.count()),
            ('User', User.objects.count()),
            ('Location', Location.objects.count()),
            ('Host', Host.objects.count()),
            ('Kiosk', Kiosk.objects.count()),
            ('Visitor', Visitor.objects.count()),
            ('PreRegistration', PreRegistration.objects.count()),
            ('Parcel', Parcel.objects.count()),
            ('Asset', Asset.objects.count()),
            ('MaintenanceRequest', MaintenanceRequest.objects.count()),
            ('Lease', Lease.objects.count()),
        ]
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('  SEED DATA SUMMARY')
        self.stdout.write('=' * 50)
        for name, count in counts:
            self.stdout.write(f'  {name:.<30} {count}')
        self.stdout.write('=' * 50)
