import logging
from typing import Dict, Any
from django.utils import timezone
from datetime import timedelta
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
import json

from visitors.models import Visitor, WatchlistEntry, Host, Location
from .llm import get_chat_llm

logger = logging.getLogger(__name__)

@tool
def get_live_visitor_stats() -> str:
    """
    Returns real-time occupancy counts: active checked-in visitors,
    pending host approvals, and checked-out visitors today.
    """
    today = timezone.now().date()
    checked_in = Visitor.objects.filter(status='CHECKED_IN').count()
    pending = Visitor.objects.filter(status='PENDING').count()
    total_today = Visitor.objects.filter(check_in_time__date=today).count()
    
    return json.dumps({
        "currently_checked_in": checked_in,
        "pending_host_approval": pending,
        "total_visitors_today": total_today,
        "timestamp": timezone.now().isoformat()
    })

@tool
def get_overstay_visitors(threshold_hours: int = 4) -> str:
    """
    Identifies visitors who have been checked in for more than the threshold hours
    or past their scheduled visit duration.
    """
    cutoff = timezone.now() - timedelta(hours=threshold_hours)
    overstays = Visitor.objects.filter(
        status='CHECKED_IN',
        check_in_time__lt=cutoff
    ).select_related('host', 'location')[:10]

    results = []
    for v in overstays:
        duration_hours = round((timezone.now() - v.check_in_time).total_seconds() / 3600, 1)
        results.append({
            "visitor_name": v.name,
            "badge_number": v.badge_number,
            "company": v.company,
            "host_name": v.host.name if v.host else "Unassigned",
            "location": v.location.name if v.location else "HQ",
            "checked_in_at": v.check_in_time.strftime("%H:%M"),
            "hours_on_premises": duration_hours
        })
    
    return json.dumps({
        "count": len(results),
        "threshold_hours": threshold_hours,
        "overstays": results
    })

@tool
def lookup_visitor_records(query: str) -> str:
    """
    Searches visitor history by name or email to view past visits, frequencies, and hosts visited.
    """
    visitors = Visitor.objects.filter(
        models_q := (Visitor.objects.filter(name__icontains=query) | Visitor.objects.filter(email__icontains=query))
    ).order_by('-check_in_time')[:5]

    history = []
    for v in visitors:
        history.append({
            "name": v.name,
            "email": v.email,
            "company": v.company,
            "host": v.host.name if v.host else "N/A",
            "status": v.status,
            "date": v.check_in_time.strftime("%Y-%m-%d %H:%M") if v.check_in_time else "N/A"
        })

    return json.dumps({"count": len(history), "history": history})

COPILOT_TOOLS = [
    get_live_visitor_stats,
    get_overstay_visitors,
    lookup_visitor_records
]

COPILOT_SYSTEM_PROMPT = """You are the Front Desk & Security AI Copilot for receptionists and security administrators.
You assist staff by providing rapid real-time insights, monitoring visitor compliance, detecting overstays, and checking past visitor logs.

Always provide concise, authoritative, bulleted summaries. Highlight potential security anomalies or long overstays prominently.
"""

_copilot_memory = MemorySaver()
_copilot_agent_instance = None

def get_copilot_agent():
    global _copilot_agent_instance
    if _copilot_agent_instance is None:
        llm = get_chat_llm(temperature=0.1, max_tokens=700)
        _copilot_agent_instance = create_react_agent(
            model=llm,
            tools=COPILOT_TOOLS,
            checkpointer=_copilot_memory,
            prompt=COPILOT_SYSTEM_PROMPT
        )
    return _copilot_agent_instance

def run_copilot_agent(session_id: str, message: str) -> Dict[str, Any]:
    try:
        agent = get_copilot_agent()
        config = {"configurable": {"thread_id": f"copilot_{session_id}"}}
        response = agent.invoke(
            {"messages": [HumanMessage(content=message)]},
            config=config
        )
        messages = response.get("messages", [])
        last_message = messages[-1] if messages else None
        return {
            "success": True,
            "reply": last_message.content if last_message else "How can I assist front desk operations?",
        }
    except Exception as e:
        logger.error(f"Error in run_copilot_agent: {str(e)}", exc_info=True)
        return {"success": False, "reply": f"Copilot error: {str(e)}"}
