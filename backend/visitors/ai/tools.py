from langchain_core.tools import tool
from visitors.models import Host, Visitor, PreRegistration, Location, WatchlistEntry
from django.db.models import Q
from django.utils import timezone
import json

@tool
def search_hosts(query: str) -> str:
    """
    Search for company hosts/employees by name, email, or department.
    Use this when a visitor mentions who they are visiting.
    """
    clean_q = query.strip()
    if not clean_q:
        return json.dumps({"error": "Empty search query"})
    
    hosts = Host.objects.filter(
        Q(name__icontains=clean_q) |
        Q(email__icontains=clean_q) |
        Q(department__icontains=clean_q)
    ).filter(is_active=True)[:5]

    results = []
    for h in hosts:
        results.append({
            "host_id": h.id,
            "name": h.name,
            "email": h.email,
            "department": h.department,
            "location": h.location.name if h.location else "Main Facility"
        })
    
    if not results:
        return json.dumps({"status": "no_match", "message": f"No employee found matching '{clean_q}'."})
    
    return json.dumps({"status": "found", "count": len(results), "hosts": results})

@tool
def check_watchlist_status(name: str = "", email: str = "", phone: str = "") -> str:
    """
    Screen a visitor against the facility watchlist and blocklist before check-in.
    Returns whether the visitor is flagged or blocked and reason.
    """
    query = Q()
    if name:
        query |= Q(name__icontains=name.strip())
    if email:
        query |= Q(email__iexact=email.strip())
    if phone:
        query |= Q(phone__icontains=phone.strip())

    if not query:
        return json.dumps({"status": "clear", "flagged": False})

    entries = WatchlistEntry.objects.filter(query, is_active=True)
    if entries.exists():
        entry = entries.first()
        return json.dumps({
            "status": "flagged",
            "flagged": True,
            "reason": entry.reason,
            "match_type": entry.match_type,
            "message": f"SECURITY ALERT: Visitor is on the facility watchlist. Reason: {entry.reason}"
        })
    
    return json.dumps({"status": "clear", "flagged": False, "message": "Visitor passed security screening."})

@tool
def lookup_preregistration_invite(identifier: str) -> str:
    """
    Lookup a pre-registration invitation by email, phone, or invite token.
    Use this when a guest says they were invited in advance or has a code.
    """
    clean_id = identifier.strip()
    invite = PreRegistration.objects.filter(
        Q(visitor_email__iexact=clean_id) |
        Q(visitor_phone__icontains=clean_id) |
        Q(token__icontains=clean_id)
    ).filter(status='PENDING').first()

    if invite:
        return json.dumps({
            "status": "found",
            "invite_id": invite.id,
            "visitor_name": invite.visitor_name,
            "visitor_email": invite.visitor_email,
            "visitor_company": invite.visitor_company,
            "host_id": invite.host.id,
            "host_name": invite.host.name,
            "host_department": invite.host.department,
            "location_id": invite.location.id,
            "expected_arrival": invite.expected_arrival.isoformat(),
            "purpose": invite.purpose or "Scheduled Meeting"
        })
    
    return json.dumps({"status": "not_found", "message": f"No active pending pre-registration found for '{clean_id}'."})

@tool
def get_facility_guide(topic: str) -> str:
    """
    Provide visitors with facility guide information like guest Wi-Fi, restrooms,
    cafeteria, emergency exits, and parking policies.
    """
    topic_lower = topic.lower()
    if "wifi" in topic_lower or "wi-fi" in topic_lower or "internet" in topic_lower:
        return "Guest Wi-Fi network: 'EnterpriseGuest' | Password: 'WelcomeToOffice2026'. Terms must be accepted in browser."
    elif "restroom" in topic_lower or "toilet" in topic_lower or "bathroom" in topic_lower:
        return "Restrooms are located down the main hall on the right, next to the central elevators on each floor."
    elif "parking" in topic_lower or "car" in topic_lower or "vehicle" in topic_lower:
        return "Visitor parking is complimentary for up to 4 hours in the marked bays on Level 1. Please register your plate with reception."
    elif "cafeteria" in topic_lower or "coffee" in topic_lower or "food" in topic_lower:
        return "The cafeteria and espresso bar are located on the Ground Floor, open from 7:30 AM to 4:00 PM."
    elif "emergency" in topic_lower or "exit" in topic_lower or "evacuation" in topic_lower:
        return "Emergency exits are illuminated with green signage at the north and south corridor ends. Assembly point is Lawn B."
    else:
        return "Our front desk receptionist is available to assist with any additional facility inquiries."

@tool
def complete_visitor_checkin(
    visitor_name: str,
    visitor_email: str,
    host_id: int,
    purpose: str = "Visit",
    visitor_phone: str = "",
    company: str = ""
) -> str:
    """
    Executes and records the visitor check-in in the database after details and host are verified.
    """
    try:
        host = Host.objects.get(id=host_id)
        location = host.location or Location.objects.first()

        # Generate badge number
        badge_count = Visitor.objects.filter(check_in_time__date=timezone.now().date()).count() + 1
        badge_number = f"V-{timezone.now().strftime('%m%d')}-{badge_count:03d}"

        visitor = Visitor.objects.create(
            name=visitor_name,
            email=visitor_email,
            phone=visitor_phone or "N/A",
            company=company or "Guest",
            host=host,
            location=location,
            purpose=purpose,
            status='CHECKED_IN',
            badge_number=badge_number,
            check_in_time=timezone.now(),
            nda_accepted=True
        )

        return json.dumps({
            "status": "success",
            "visitor_id": visitor.id,
            "badge_number": badge_number,
            "message": f"Successfully checked in {visitor.name}! Host {host.name} has been notified of your arrival.",
            "host_name": host.name,
            "location": location.name if location else "HQ"
        })
    except Host.DoesNotExist:
        return json.dumps({"status": "error", "message": f"Host ID {host_id} does not exist."})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})

# List of tools provided to Kiosk Agent
KIOSK_TOOLS = [
    search_hosts,
    check_watchlist_status,
    lookup_preregistration_invite,
    get_facility_guide,
    complete_visitor_checkin
]
