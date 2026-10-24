import logging
from django.utils import timezone
from langchain_core.messages import SystemMessage, HumanMessage
from visitors.models import Visitor
from .llm import get_chat_llm

logger = logging.getLogger(__name__)

BRIEFING_SYSTEM_PROMPT = """You are an Executive Visitor Intelligence AI.
Your job is to generate a concise, high-value 2-sentence briefing for an employee/host whose visitor has arrived.

Include:
1. Visitor's full name, company, and purpose.
2. Context on visit history (e.g. first-time guest vs. returning partner) and compliance (e.g. NDA signed, vehicle plate registered).
Keep it crisp, professional, and actionable. Do not add conversational filler.
"""

def generate_host_briefing(visitor: Visitor) -> str:
    """
    Generates an executive briefing for the host regarding an arriving visitor.
    Saves the briefing to `visitor.ai_briefing`.
    """
    try:
        # Check previous visits by this guest
        past_visits = Visitor.objects.filter(
            email=visitor.email
        ).exclude(id=visitor.id)
        past_count = past_visits.count()

        previous_hosts = list(past_visits.values_list('host__name', flat=True).distinct()[:3])
        prev_hosts_str = ", ".join([h for h in previous_hosts if h]) or "None"

        prompt_content = f"""
Visitor Profile:
- Name: {visitor.name}
- Company: {visitor.company or 'Independent / Not specified'}
- Purpose: {visitor.purpose or 'General Business Meeting'}
- Host: {visitor.host.name if visitor.host else 'Unassigned'} ({visitor.host.department if visitor.host else 'General'})
- Previous Visits: {past_count} past visits (Previous hosts: {prev_hosts_str})
- NDA Status: {'NDA Signed & on file' if visitor.nda_accepted else 'Pending signature'}
- Vehicle Plate: {visitor.number_plate or 'No vehicle registered'}
- Arrival Time: {timezone.localtime(visitor.checkin_time).strftime('%I:%M %p') if visitor.checkin_time else 'Just now'}

Write the 2-sentence executive host briefing now:
"""

        llm = get_chat_llm(temperature=0.2, max_tokens=250)
        response = llm.invoke([
            SystemMessage(content=BRIEFING_SYSTEM_PROMPT),
            HumanMessage(content=prompt_content)
        ])

        briefing = response.content.strip()
        visitor.ai_briefing = briefing
        visitor.save(update_fields=['ai_briefing'])
        return briefing

    except Exception as e:
        logger.error(f"Failed to generate host briefing for visitor {visitor.id}: {str(e)}", exc_info=True)
        fallback = f"{visitor.name} from {visitor.company or 'Guest'} has arrived for '{visitor.purpose or 'Visit'}'. Host has been notified."
        visitor.ai_briefing = fallback
        try:
            visitor.save(update_fields=['ai_briefing'])
        except Exception:
            pass
        return fallback
