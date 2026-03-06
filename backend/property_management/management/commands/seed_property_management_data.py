"""
Comprehensive Data Seeding for Property Management

This management command creates comprehensive test data for the property management system,
including tenants, locations, users, maintenance categories, vendors, assets,
maintenance requests, work orders, and cost centers.

Usage:
    python manage.py seed_property_management_data

The command creates realistic test data that demonstrates all features of the system.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date
import random
import uuid

from visitors.models import Tenant, Location, Host, UserProfile
from property_management.models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, MaintenancePhoto,
    WorkOrder, AssetType, Asset, MaintenanceSchedule, AssetCheckout,
    CostCenter, MaintenanceExpense, PriorityLevel, MaintenanceStatus, AssetStatus
)


class Command(BaseCommand):
    help = 'Seed comprehensive property management data for testing and demonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing property management data before seeding',
        )
        parser.add_argument(
            '--tenants',
            type=int,
            default=3,
            help='Number of tenants to create (default: 3)',
        )
        parser.add_argument(
            '--locations',
            type=int,
            default=5,
            help='Number of locations per tenant (default: 5)',
        )
        parser.add_argument(
            '--requests',
            type=int,
            default=20,
            help='Number of maintenance requests per location (default: 20)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting comprehensive property management data seeding...'))

        if options['clear']:
            self.clear_existing_data()

        # Create base data
        tenants = self.create_tenants(options['tenants'])
        locations = self.create_locations(tenants, options['locations'])
        users = self.create_users(tenants, locations)
        hosts = self.create_hosts(users, locations)
        categories = self.create_maintenance_categories(tenants)
        vendors = self.create_vendors(tenants, categories)
        asset_types = self.create_asset_types(tenants)
        cost_centers = self.create_cost_centers(tenants, hosts)

        # Create assets
        assets = self.create_assets(locations, asset_types)

        # Create maintenance requests and related data
        maintenance_requests = self.create_maintenance_requests(
            locations, categories, hosts, options['requests']
        )
        work_orders = self.create_work_orders(maintenance_requests, vendors)
        schedules = self.create_maintenance_schedules(assets, vendors)
        expenses = self.create_maintenance_expenses(work_orders, cost_centers)
        checkouts = self.create_asset_checkouts(assets, users)

        # Create historical data
        self.create_historical_data(assets, maintenance_requests, work_orders)

        # Print summary
        self.print_summary(tenants, locations, hosts, categories, vendors, 
                          assets, maintenance_requests, work_orders, cost_centers)

        self.stdout.write(self.style.SUCCESS('Property management data seeding completed successfully!'))

    def clear_existing_data(self):
        """Clear existing property management data"""
        self.stdout.write('Clearing existing property management data...')
        
        models_to_clear = [
            MaintenanceExpense, AssetCheckout, MaintenanceSchedule, WorkOrder,
            MaintenancePhoto, MaintenanceRequest, Asset, AssetType, Vendor,
            CostCenter, MaintenanceCategory
        ]
        
        for model in models_to_clear:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f'  Cleared {count} {model.__name__} records')

    def create_tenants(self, count):
        """Create tenant organizations"""
        self.stdout.write(f'Creating {count} tenants...')
        
        # First, try to use existing tenants
        existing_tenants = list(Tenant.objects.all()[:count])
        
        if len(existing_tenants) >= count:
            self.stdout.write(f'  Using {count} existing tenants')
            return existing_tenants
        
        # Create additional tenants if needed
        needed = count - len(existing_tenants)
        self.stdout.write(f'  Creating {needed} additional tenants...')
        
        tenant_data = [
            {
                'name': 'Demo Corp Solutions',
                'slug': f'democorp-{timezone.now().timestamp()}',
                'domain': 'democorp.com',
                'subdomain': f'democorp-{int(timezone.now().timestamp())}',
                'billing_email': 'billing@democorp.com',
                'tier': 'ENTERPRISE',
                'status': 'ACTIVE'
            },
            {
                'name': 'Test Industries',
                'slug': f'testindustries-{timezone.now().timestamp()}',
                'domain': 'testindustries.com',
                'subdomain': f'testindustries-{int(timezone.now().timestamp())}',
                'billing_email': 'billing@testindustries.com',
                'tier': 'PROFESSIONAL',
                'status': 'ACTIVE'
            },
            {
                'name': 'Sample Ventures',
                'slug': f'sampleventures-{timezone.now().timestamp()}',
                'domain': 'sampleventures.com',
                'subdomain': f'sampleventures-{int(timezone.now().timestamp())}',
                'billing_email': 'billing@sampleventures.com',
                'tier': 'STARTER',
                'status': 'ACTIVE'
            }
        ]

        tenants = existing_tenants.copy()
        for i, data in enumerate(tenant_data[:needed]):
            tenant = Tenant.objects.create(**data)
            tenants.append(tenant)
            self.stdout.write(f'  Created tenant: {tenant.name}')

        return tenants

    def create_locations(self, tenants, locations_per_tenant):
        """Create locations for each tenant"""
        self.stdout.write(f'Creating {locations_per_tenant} locations per tenant...')
        
        location_names = [
            'Main Office', 'Branch Office', 'Warehouse', 'Conference Center',
            'Data Center', 'Manufacturing Plant', 'Retail Store', 'Research Lab'
        ]

        locations = []
        for tenant in tenants:
            for i in range(locations_per_tenant):
                name = location_names[i % len(location_names)]
                location = Location.objects.create(
                    tenant=tenant,
                    name=f"{tenant.name} - {name}",
                    address=f"{100 + i} Business Ave, Suite {i + 1}, City, State {10000 + i}",
                    floor=f"Floor {i + 1}" if i > 0 else "Ground Floor",
                    timezone="America/New_York",
                    require_visitor_approval=i % 2 == 0,
                    require_nda=i % 3 == 0
                )
                locations.append(location)
                self.stdout.write(f'  Created location: {location.name}')

        return locations

    def create_users(self, tenants, locations):
        """Create users for each tenant"""
        self.stdout.write('Creating users...')
        
        users = []
        user_types = [
            ('admin', 'Administrator', 'ADMIN'),
            ('manager', 'Manager', 'MANAGER'),
            ('host', 'Host', 'HOST'),
            ('kiosk', 'Kiosk', 'KIOSK')
        ]

        for tenant in tenants:
            for i, (username_suffix, role_name, role) in enumerate(user_types):
                for j in range(2):  # 2 users of each type per tenant
                    username = f"{tenant.subdomain}_{username_suffix}{j + 1}"
                    email = f"{username}@{tenant.domain if tenant.domain else 'example.com'}"
                    
                    # Check if user already exists
                    try:
                        user = User.objects.get(username=username)
                        self.stdout.write(f'  Using existing user: {email}')
                    except User.DoesNotExist:
                        user = User.objects.create_user(
                            username=username,
                            email=email,
                            password='demo123456',
                            first_name=f'{role_name} {j + 1}',
                            last_name=f'{tenant.name}'
                        )
                        self.stdout.write(f'  Created user: {email}')
                    
                    # Create or update user profile
                    profile, created = UserProfile.objects.get_or_create(
                        user=user,
                        defaults={
                            'role': role,
                            'location': locations[j % len(locations)]
                        }
                    )
                    
                    if not created:
                        # Update existing profile
                        profile.role = role
                        profile.location = locations[j % len(locations)]
                        profile.save()
                    
                    users.append(user)

        return users

    def create_hosts(self, users, locations):
        """Create host records for users with HOST role"""
        self.stdout.write('Creating hosts...')
        
        hosts = []
        for user in users:
            if hasattr(user, 'profile') and user.profile.role == 'HOST':
                # Check if host already exists
                try:
                    host = Host.objects.get(user=user)
                    self.stdout.write(f'  Using existing host: {host.name}')
                except Host.DoesNotExist:
                    host = Host.objects.create(
                        tenant=user.profile.location.tenant,
                        name=f"{user.first_name} {user.last_name}",
                        email=user.email,
                        department=random.choice(['Engineering', 'Sales', 'Marketing', 'HR', 'Operations']),
                        phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                        location=user.profile.location,
                        user=user
                    )
                    self.stdout.write(f'  Created host: {host.name}')
                
                hosts.append(host)

        return hosts

    def create_maintenance_categories(self, tenants):
        """Create maintenance categories"""
        self.stdout.write('Creating maintenance categories...')
        
        category_data = [
            ('HVAC', 'Heating, ventilation, and air conditioning systems'),
            ('Electrical', 'Electrical systems, wiring, and lighting'),
            ('Plumbing', 'Plumbing fixtures, pipes, and drainage'),
            ('Elevator', 'Elevator maintenance and inspection'),
            ('Fire Safety', 'Fire alarms, sprinklers, and safety equipment'),
            ('Security', 'Security systems, cameras, and access control'),
            ('Cleaning', 'Janitorial services and deep cleaning'),
            ('Landscaping', 'Grounds maintenance and landscaping'),
            ('IT Equipment', 'Computers, servers, and network equipment'),
            ('Appliances', 'Kitchen appliances and break room equipment')
        ]

        categories = []
        for tenant in tenants:
            for name, description in category_data:
                category = MaintenanceCategory.objects.create(
                    tenant=tenant,
                    name=name,
                    description=description,
                    is_active=True
                )
                categories.append(category)
                self.stdout.write(f'  Created category: {name}')

        return categories

    def create_vendors(self, tenants, categories):
        """Create vendor companies"""
        self.stdout.write('Creating vendors...')
        
        vendor_data = [
            {
                'name': 'HVAC Professionals Inc',
                'contact_person': 'Mike Smith',
                'company': 'HVAC Professionals Inc',
                'specialties': ['HVAC'],
                'rating': 4.5
            },
            {
                'name': 'Electrician Services LLC',
                'contact_person': 'Sarah Johnson',
                'company': 'Electrician Services LLC',
                'specialties': ['Electrical'],
                'rating': 4.7
            },
            {
                'name': 'Plumbing Experts',
                'contact_person': 'Tom Wilson',
                'company': 'Plumbing Experts',
                'specialties': ['Plumbing'],
                'rating': 4.3
            },
            {
                'name': 'Facility Management Pro',
                'contact_person': 'Lisa Chen',
                'company': 'Facility Management Pro',
                'specialties': ['HVAC', 'Electrical', 'Plumbing'],
                'rating': 4.6
            },
            {
                'name': 'Security Systems Plus',
                'contact_person': 'James Davis',
                'company': 'Security Systems Plus',
                'specialties': ['Security'],
                'rating': 4.8
            },
            {
                'name': 'Fire Safety Services',
                'contact_person': 'Robert Brown',
                'company': 'Fire Safety Services',
                'specialties': ['Fire Safety'],
                'rating': 4.9
            },
            {
                'name': 'Building Maintenance Co',
                'contact_person': 'Maria Garcia',
                'company': 'Building Maintenance Co',
                'specialties': ['Cleaning', 'Landscaping'],
                'rating': 4.2
            },
            {
                'name': 'IT Support Solutions',
                'contact_person': 'David Lee',
                'company': 'IT Support Solutions',
                'specialties': ['IT Equipment'],
                'rating': 4.4
            }
        ]

        vendors = []
        for tenant in tenants:
            for vendor_info in vendor_data:
                vendor = Vendor.objects.create(
                    tenant=tenant,
                    name=vendor_info['name'],
                    contact_person=vendor_info['contact_person'],
                    phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                    email=f"{vendor_info['contact_person'].lower().replace(' ', '.')}@{vendor_info['company'].lower().replace(' ', '.')}.com",
                    company=vendor_info['company'],
                    is_active=True,
                    insurance_verified=random.choice([True, False]),
                    insurance_expiry=date.today() + timedelta(days=random.randint(30, 365)),
                    rating=vendor_info['rating']
                )
                
                # Add specialties
                for specialty_name in vendor_info['specialties']:
                    category = next((c for c in categories if c.name == specialty_name and c.tenant == tenant), None)
                    if category:
                        vendor.specialties.add(category)
                
                vendors.append(vendor)
                self.stdout.write(f'  Created vendor: {vendor.name}')

        return vendors

    def create_asset_types(self, tenants):
        """Create asset types"""
        self.stdout.write('Creating asset types...')
        
        asset_type_data = [
            ('Air Conditioner', 'HVAC cooling units', True, 30),
            ('Heating Unit', 'HVAC heating systems', True, 60),
            ('Electrical Panel', 'Electrical distribution panels', True, 90),
            ('Elevator', 'Passenger elevators', True, 30),
            ('Fire Alarm', 'Fire alarm systems', True, 30),
            ('Security Camera', 'Security surveillance cameras', True, 45),
            ('Server', 'Computer servers', True, 30),
            ('Printer', 'Office printers', False, 90),
            ('Coffee Machine', 'Break room appliances', False, 30),
            ('Water Heater', 'Water heating systems', True, 90)
        ]

        asset_types = []
        for tenant in tenants:
            for name, description, requires_maintenance, interval_days in asset_type_data:
                asset_type = AssetType.objects.create(
                    tenant=tenant,
                    name=name,
                    description=description,
                    requires_maintenance=requires_maintenance,
                    maintenance_interval_days=interval_days,
                    is_active=True
                )
                asset_types.append(asset_type)
                self.stdout.write(f'  Created asset type: {name}')

        return asset_types

    def create_cost_centers(self, tenants, hosts):
        """Create cost centers for expense tracking"""
        self.stdout.write('Creating cost centers...')
        
        cost_center_data = [
            ('General Operations', 'OPS', 100000.00),
            ('IT Department', 'IT', 75000.00),
            ('Facilities Management', 'FAC', 125000.00),
            ('Security', 'SEC', 50000.00),
            ('Administrative', 'ADM', 25000.00)
        ]

        cost_centers = []
        counter = 1
        for tenant in tenants:
            tenant_hosts = [h for h in hosts if h.tenant == tenant]
            for i, (name, code, budget) in enumerate(cost_center_data):
                manager = tenant_hosts[i % len(tenant_hosts)] if tenant_hosts else None
                
                # Create unique code for each tenant
                unique_code = f"{code}-{tenant.subdomain[:8].upper()}-{counter}"
                counter += 1
                
                cost_center = CostCenter.objects.create(
                    tenant=tenant,
                    name=f"{tenant.name} - {name}",
                    code=unique_code,
                    description=f"Cost center for {name.lower()}",
                    budget_limit=budget,
                    manager=manager
                )
                cost_centers.append(cost_center)
                self.stdout.write(f'  Created cost center: {cost_center.name}')

        return cost_centers

    def create_assets(self, locations, asset_types):
        """Create physical assets"""
        self.stdout.write('Creating assets...')
        
        assets = []
        asset_id = 1

        for location in locations:
            location_asset_types = [at for at in asset_types if at.tenant == location.tenant]
            
            # Create 5-10 assets per location
            for i in range(random.randint(5, 10)):
                if not location_asset_types:
                    continue
                    
                asset_type = random.choice(location_asset_types)
                asset = Asset.objects.create(
                    tenant=location.tenant,
                    name=f"{asset_type.name} - {location.name.split(' - ')[-1]} {i + 1}",
                    description=f"Primary {asset_type.name.lower()} unit for {location.name}",
                    asset_type=asset_type,
                    location=location,
                    serial_number=f"{asset_type.name[:3].upper()}-{asset_id:06d}",
                    manufacturer=random.choice(['Carrier', 'Trane', 'Honeywell', 'Schneider', 'Dell', 'HP']),
                    model=f"Model-{random.choice(['X100', 'Pro2000', 'Elite300', 'Standard400'])}",
                    purchase_date=timezone.now() - timedelta(days=random.randint(365, 1825)),
                    warranty_expiry=timezone.now() + timedelta(days=random.randint(30, 1095)),
                    expected_lifespan_years=random.randint(5, 15),
                    location_detail=random.choice(['Main Area', f'Room {i + 1}', f'Section {chr(65 + i)}']),
                    status=random.choice(list(AssetStatus.values))
                )
                
                # Generate QR code
                asset.qr_code = f"ASSET-{asset.id}"
                asset.save()
                
                # Set maintenance dates for assets that require maintenance
                if asset_type.requires_maintenance:
                    asset.last_maintenance_date = timezone.now() - timedelta(days=random.randint(1, 60))
                    asset.next_maintenance_date = asset.last_maintenance_date + timedelta(days=asset_type.maintenance_interval_days)
                    asset.save()
                
                assets.append(asset)
                asset_id += 1
                self.stdout.write(f'  Created asset: {asset.name}')

        return assets

    def create_maintenance_requests(self, locations, categories, hosts, requests_per_location):
        """Create maintenance requests"""
        self.stdout.write('Creating maintenance requests...')
        
        request_titles = {
            'HVAC': [
                'AC unit not cooling properly',
                'Heating system making strange noises',
                'Thermostat malfunction',
                'Air quality issues',
                'Fan not working'
            ],
            'Electrical': [
                'Lights flickering',
                'Power outlet not working',
                'Circuit breaker tripping',
                'Emergency exit light issue',
                'Electrical panel inspection needed'
            ],
            'Plumbing': [
                'Leaky faucet',
                'Clogged drain',
                'Low water pressure',
                'Running toilet',
                'Water heater issue'
            ],
            'Security': [
                'Security camera offline',
                'Access control malfunction',
                'Alarm system test',
                'Motion sensor issue',
                'Door lock problem'
            ],
            'Fire Safety': [
                'Fire alarm test',
                'Sprinkler inspection',
                'Fire extinguisher check',
                'Emergency light test',
                'Smoke detector issue'
            ]
        }

        requests = []
        for location in locations:
            location_categories = [c for c in categories if c.tenant == location.tenant]
            location_hosts = [h for h in hosts if h.location == location]
            
            for i in range(requests_per_location):
                category = random.choice(location_categories)
                titles = request_titles.get(category.name, ['General maintenance issue'])
                title = random.choice(titles)
                
                # Handle host assignment - allow None if no hosts available
                host = random.choice(location_hosts) if location_hosts else None
                
                request = MaintenanceRequest.objects.create(
                    tenant=location.tenant,
                    title=title,
                    description=f"Detailed description of {title.lower()} at {location.name}. Issue reported on {timezone.now().date()}.",
                    priority=random.choice(list(PriorityLevel.values)),
                    status=random.choice(list(MaintenanceStatus.values)),
                    category=category,
                    location=location,
                    host=host,  # Can be None if no hosts available
                    requested_at=timezone.now() - timedelta(days=random.randint(0, 30)),
                    estimated_cost=random.uniform(100, 2000) if random.random() > 0.3 else None,
                    actual_cost=random.uniform(100, 2500) if random.random() > 0.7 else None
                )
                
                # Set timestamps based on status
                if request.status in [MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED]:
                    request.assigned_at = request.requested_at + timedelta(hours=random.randint(1, 24))
                
                if request.status in [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED]:
                    request.started_at = request.assigned_at + timedelta(hours=random.randint(1, 48))
                
                if request.status == MaintenanceStatus.COMPLETED:
                    request.completed_at = request.started_at + timedelta(hours=random.randint(2, 72))
                
                request.save()
                requests.append(request)
                self.stdout.write(f'  Created request: {title}')

        return requests

    def create_work_orders(self, maintenance_requests, vendors):
        """Create work orders for maintenance requests"""
        self.stdout.write('Creating work orders...')
        
        work_orders = []
        for request in maintenance_requests:
            if request.status in [MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED]:
                # Find a vendor with appropriate specialty
                suitable_vendors = [v for v in vendors if v.tenant == request.tenant and request.category in v.specialties.all()]
                
                if suitable_vendors:
                    vendor = random.choice(suitable_vendors)
                    
                    work_order = WorkOrder.objects.create(
                        maintenance_request=request,
                        vendor=vendor,
                        work_order_number=f"WO-{timezone.now().year}-{random.randint(10000, 99999)}",
                        instructions=f"Please address the {request.title.lower()}. Contact host if access is required.",
                        labor_cost=random.uniform(100, 1000),
                        material_cost=random.uniform(50, 1500),
                        estimated_duration_hours=random.uniform(1, 8),
                        assigned_technician=f"Tech {random.randint(100, 999)}"
                    )
                    work_orders.append(work_order)
                    self.stdout.write(f'  Created work order: {work_order.work_order_number}')

        return work_orders

    def create_maintenance_schedules(self, assets, vendors):
        """Create scheduled maintenance"""
        self.stdout.write('Creating maintenance schedules...')
        
        schedules = []
        for asset in assets:
            if asset.asset_type.requires_maintenance and random.random() > 0.3:
                # Find suitable vendor
                suitable_vendors = [v for v in vendors if v.tenant == asset.tenant and asset.asset_type in v.specialties.all()]
                
                if suitable_vendors:
                    vendor = random.choice(suitable_vendors)
                    
                    # Create schedule for next maintenance
                    next_date = timezone.now() + timedelta(days=random.randint(1, 90))
                    
                    schedule = MaintenanceSchedule.objects.create(
                        asset=asset,
                        title=f"Routine {asset.asset_type.name} Maintenance",
                        description=f"Scheduled maintenance for {asset.name}",
                        scheduled_date=next_date,
                        estimated_duration_hours=random.uniform(2, 8),
                        assigned_to=vendor,
                        status=random.choice([MaintenanceStatus.REQUESTED, MaintenanceStatus.ASSIGNED])
                    )
                    schedules.append(schedule)
                    self.stdout.write(f'  Created schedule: {schedule.title}')

        return schedules

    def create_maintenance_expenses(self, work_orders, cost_centers):
        """Create expense records for work orders"""
        self.stdout.write('Creating maintenance expenses...')
        
        expenses = []
        for work_order in work_orders:
            if work_order.maintenance_request.status == MaintenanceStatus.COMPLETED:
                tenant_cost_centers = [cc for cc in cost_centers if cc.tenant == work_order.maintenance_request.tenant]
                
                if tenant_cost_centers:
                    cost_center = random.choice(tenant_cost_centers)
                    
                    # Create 1-3 expenses per work order
                    for i in range(random.randint(1, 3)):
                        expense_type = random.choice(['LABOR', 'MATERIALS', 'EQUIPMENT', 'PERMIT'])
                        
                        if expense_type == 'LABOR':
                            amount = work_order.labor_cost * random.uniform(0.8, 1.2)
                            description = f"Labor charges for {work_order.work_order_number}"
                        elif expense_type == 'MATERIALS':
                            amount = work_order.material_cost * random.uniform(0.7, 1.3)
                            description = f"Materials for {work_order.work_order_number}"
                        else:
                            amount = random.uniform(50, 500)
                            description = f"Additional costs for {work_order.work_order_number}"
                        
                        expense = MaintenanceExpense.objects.create(
                            maintenance_request=work_order.maintenance_request,
                            cost_center=cost_center,
                            expense_type=expense_type,
                            description=description,
                            amount=round(amount, 2),
                            created_at=work_order.maintenance_request.completed_at or timezone.now()
                        )
                        expenses.append(expense)
                        self.stdout.write(f'  Created expense: {expense_type} - ${amount:.2f}')

        return expenses

    def create_asset_checkouts(self, assets, users):
        """Create asset checkout records"""
        self.stdout.write('Creating asset checkouts...')
        
        checkouts = []
        for asset in assets:
            if random.random() > 0.8:  # 20% of assets have checkout history
                user = random.choice(users)
                
                checkout = AssetCheckout.objects.create(
                    asset=asset,
                    checked_out_by=user,
                    expected_return_at=timezone.now() - timedelta(days=random.randint(1, 30)),
                    actual_return_at=timezone.now() - timedelta(days=random.randint(0, 29)) if random.random() > 0.3 else None,
                    notes=random.choice([
                        "Temporary loan for maintenance work",
                        "Equipment testing",
                        "Backup unit deployment",
                        "Calibration service"
                    ]),
                    condition_checkout=random.choice(['Excellent', 'Good', 'Fair', 'Needs Repair']),
                    condition_return=random.choice(['Excellent', 'Good', 'Fair', 'Needs Repair']) if random.random() > 0.3 else ''
                )
                checkouts.append(checkout)
                self.stdout.write(f'  Created checkout: {asset.name} by {user.username}')

        return checkouts

    def create_historical_data(self, assets, maintenance_requests, work_orders):
        """Create historical data for analytics"""
        self.stdout.write('Creating historical data...')
        
        # Update some assets with maintenance history
        for asset in random.sample(list(assets), min(20, len(assets))):
            if asset.asset_type.requires_maintenance:
                # Create maintenance history
                for i in range(random.randint(1, 5)):
                    past_date = timezone.now() - timedelta(days=random.randint(30, 365))
                    asset.last_maintenance_date = past_date
                    asset.next_maintenance_date = past_date + timedelta(days=asset.asset_type.maintenance_interval_days)
                    asset.save()

        # Update some requests with completion history
        for request in random.sample(list(maintenance_requests), min(10, len(maintenance_requests))):
            if request.status == MaintenanceStatus.COMPLETED:
                request.completed_at = timezone.now() - timedelta(days=random.randint(1, 90))
                request.save()

    def print_summary(self, tenants, locations, hosts, categories, vendors, 
                      assets, maintenance_requests, work_orders, cost_centers):
        """Print summary of created data"""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('DATA SEEDING SUMMARY')
        self.stdout.write('=' * 50)
        self.stdout.write(f'Tenants: {len(tenants)}')
        self.stdout.write(f'Locations: {len(locations)}')
        self.stdout.write(f'Hosts: {len(hosts)}')
        self.stdout.write(f'Maintenance Categories: {len(categories)}')
        self.stdout.write(f'Vendors: {len(vendors)}')
        self.stdout.write(f'Assets: {len(assets)}')
        self.stdout.write(f'Maintenance Requests: {len(maintenance_requests)}')
        self.stdout.write(f'Work Orders: {len(work_orders)}')
        self.stdout.write(f'Cost Centers: {len(cost_centers)}')
        self.stdout.write('=' * 50)
