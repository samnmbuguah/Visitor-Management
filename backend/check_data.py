import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from visitors.models import Visitor, Location, UserProfile
from django.contrib.auth import get_user_model

User = get_user_model()

# Check Kiosk user
kiosk_user = User.objects.filter(username='kiosk').first()
if kiosk_user:
    profile = getattr(kiosk_user, 'profile', None)
    print(f"User: {kiosk_user.username}")
    if profile:
        print(f"  Role: {profile.role}")
        print(f"  Location: {profile.location} (ID: {profile.location_id if profile.location else 'None'})")
        print(f"  Tenant: {profile.location.tenant if profile.location and profile.location.tenant else 'None'}")
    else:
        print("  No profile found for kiosk user!")

# Check Visitors
print("\nRecent Visitors:")
for visitor in Visitor.objects.all().order_by('-id')[:5]:
    print(f"Visitor: {visitor.name} (ID: {visitor.id})")
    print(f"  Status: {visitor.status}")
    print(f"  Location: {visitor.location} (ID: {visitor.location_id})")
    print(f"  Host: {visitor.host}")
    print(f"  Tenant: {visitor.location.tenant if visitor.location and visitor.location.tenant else 'None'}")
