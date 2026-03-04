import os
import django
import sys

# Setup Django environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from visitors.models import Location, Host, UserProfile, Kiosk, NotificationTemplate

def create_demo_data():
    print("🚀 Starting Demo Data setup...")

    # 1. Create Location
    loc, created = Location.objects.get_or_create(
        name="Main Office",
        defaults={
            "address": "123 Innovation Drive, Tech City",
            "floor": "Ground Floor",
            "timezone": "UTC",
            "require_visitor_approval": True
        }
    )
    if created: print(f"✅ Created Location: {loc.name}")
    else: print(f"ℹ️ Location {loc.name} already exists")

    # 2. Create Kiosk
    kiosk, created = Kiosk.objects.get_or_create(
        name="Lobby Kiosk 1",
        location=loc,
        defaults={"is_active": True}
    )
    if created: print(f"✅ Created Kiosk: {kiosk.name}")

    # 3. Create Superuser (Admin Dashboard)
    if not User.objects.filter(username="admin").exists():
        admin_user = User.objects.create_superuser("admin", "admin@example.com", "admin123")
        UserProfile.objects.get_or_create(user=admin_user, defaults={"role": "SUPER_ADMIN", "location": loc})
        print("✅ Created Superuser: admin / admin123")
    else:
        print("ℹ️ Superuser admin already exists")

    # 4. Create Host User
    if not User.objects.filter(username="host").exists():
        host_user = User.objects.create_user("host", "host@example.com", "host123")
        UserProfile.objects.get_or_create(user=host_user, defaults={"role": "HOST", "location": loc})
        Host.objects.get_or_create(
            user=host_user,
            defaults={
                "name": "Sarah Host",
                "email": "sarah@example.com",
                "department": "Engineering",
                "location": loc
            }
        )
        print("✅ Created Host User: host / host123")
    else:
        print("ℹ️ Host user already exists")

    # 5. Create Kiosk User (for the app login if needed)
    if not User.objects.filter(username="kiosk").exists():
        kiosk_user = User.objects.create_user("kiosk", "kiosk@example.com", "kiosk123")
        UserProfile.objects.get_or_create(user=kiosk_user, defaults={"role": "ADMIN", "location": loc})
        print("✅ Created Kiosk-Admin User: kiosk / kiosk123")

    # 6. Notification Templates
    NotificationTemplate.objects.get_or_create(
        name="Visitor Arrival",
        type="VISITOR_ARRIVAL",
        location=loc,
        defaults={
            "subject": "Visitor Arrived: {{visitor_name}}",
            "body": "Hi {{host_name}}, your visitor {{visitor_name}} from {{company}} has arrived at the {{location}}."
        }
    )
    print("✅ Created Notification Templates")

    print("\n✨ Demo setup complete! You can now log into:")
    print("- Web/Mobile Admin: admin / admin123")
    print("- Mobile Host: host / host123")
    print("- Mobile Kiosk: kiosk / kiosk123")

if __name__ == "__main__":
    create_demo_data()
