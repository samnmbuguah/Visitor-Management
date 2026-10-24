#!/usr/bin/env python
"""
Verification script to inspect Visitor Management database contents.
"""

import os
import sys
import django

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from visitors.models import (
    Tenant, Location, Host, Visitor, PreRegistration,
    Kiosk, WatchlistEntry, NotificationTemplate, Parcel
)

def print_section(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print('='*60)

def verify_data():
    print_section("VISITOR MANAGEMENT DATA VERIFICATION")
    
    tenants = Tenant.objects.all()
    print(f"\nTenants ({tenants.count()}):")
    for t in tenants:
        print(f"  • {t.name} (slug: {t.slug}, status: {t.status})")
    
    locations = Location.objects.all()
    print(f"\nLocations ({locations.count()}):")
    for loc in locations:
        print(f"  • {loc.name} - Floor: {loc.floor or 'N/A'} (Tenant: {loc.tenant.name if loc.tenant else 'None'})")
    
    hosts = Host.objects.all()
    print(f"\nHosts ({hosts.count()}):")
    for h in hosts[:5]:
        print(f"  • {h.name} - {h.email} ({h.department})")
    if hosts.count() > 5:
        print(f"  ... and {hosts.count() - 5} more")

    visitors = Visitor.objects.all()
    print(f"\nVisitors ({visitors.count()}):")
    for v in visitors[:5]:
        print(f"  • {v.name} - Status: {v.status} (Host: {v.host.name if v.host else 'None'})")
    if visitors.count() > 5:
        print(f"  ... and {visitors.count() - 5} more")

    invites = PreRegistration.objects.all()
    print(f"\nPre-Registrations ({invites.count()}):")
    for p in invites[:5]:
        print(f"  • {p.visitor_name} - Status: {p.status}")
    if invites.count() > 5:
        print(f"  ... and {invites.count() - 5} more")

    kiosks = Kiosk.objects.all()
    print(f"\nKiosks ({kiosks.count()}):")
    for k in kiosks:
        print(f"  • {k.name} @ {k.location.name}")

    watchlist = WatchlistEntry.objects.all()
    print(f"\nWatchlist Entries ({watchlist.count()}):")
    for w in watchlist:
        print(f"  • {w.name or w.email} - Reason: {w.reason}")

    print("\n" + "="*60)
    print(" VERIFICATION COMPLETE")
    print("="*60 + "\n")

if __name__ == '__main__':
    verify_data()
