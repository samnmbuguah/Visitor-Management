import logging
from typing import Dict, Any, List
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from .llm import get_chat_llm
from .tools import KIOSK_TOOLS

logger = logging.getLogger(__name__)

KIOSK_SYSTEM_PROMPT = """You are the AI Kiosk Concierge for an enterprise visitor management system.
You operate on an interactive lobby tablet or front-desk check-in screen.

Your mission:
1. Warmly greet guests and guide them through a smooth, secure check-in experience.
2. If the visitor was invited in advance or has an invite code/email, use `lookup_preregistration_invite` to find their record.
3. If the visitor is a walk-in:
   - Inquire who they are visiting and use `search_hosts` to find and confirm the employee.
   - Collect their full name, email address, company name, and visit purpose.
   - Screen them with `check_watchlist_status`. If they are flagged, do NOT proceed with check-in; politely instruct them to step up to the security desk.
4. Once information is verified and the visitor confirms, invoke `complete_visitor_checkin` to create their badge and notify the host.
5. Answer any questions about facility amenities (guest Wi-Fi password, restrooms, parking rules, cafeteria) using `get_facility_guide`.

Guidelines:
- Keep responses concise, clear, and professional (under 3 sentences per turn where possible).
- Be polite, courteous, and efficient.
- Never make up host details or IDs without searching first.
"""

# Global memory saver for kiosk multi-turn conversation sessions
_memory_checkpointer = MemorySaver()
_kiosk_agent_instance = None

def get_kiosk_agent():
    """Returns or lazily initializes the compiled LangGraph Kiosk Agent."""
    global _kiosk_agent_instance
    if _kiosk_agent_instance is None:
        llm = get_chat_llm(temperature=0.1, max_tokens=600)
        _kiosk_agent_instance = create_react_agent(
            model=llm,
            tools=KIOSK_TOOLS,
            checkpointer=_memory_checkpointer,
            prompt=KIOSK_SYSTEM_PROMPT
        )
    return _kiosk_agent_instance

def run_kiosk_agent(session_id: str, message: str) -> Dict[str, Any]:
    """
    Executes a turn of the Kiosk Concierge agent within a given session thread.
    Returns the agent's reply, invoked tool calls, and session status.
    """
    try:
        agent = get_kiosk_agent()
        config = {"configurable": {"thread_id": session_id}}

        response = agent.invoke(
            {"messages": [HumanMessage(content=message)]},
            config=config
        )

        messages = response.get("messages", [])
        last_message = messages[-1] if messages else None
        reply_text = last_message.content if last_message else "How can I assist your visit today?"

        # Inspect if any tools were called in this step
        tool_calls_executed = []
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls_executed.append({
                        "tool": tc.get("name"),
                        "args": tc.get("args")
                    })

        return {
            "success": True,
            "session_id": session_id,
            "reply": reply_text,
            "tool_calls": tool_calls_executed
        }

    except Exception as e:
        logger.error(f"Error in run_kiosk_agent: {str(e)}", exc_info=True)
        return {
            "success": False,
            "session_id": session_id,
            "reply": f"I apologize, I encountered a temporary error: {str(e)}. Please speak with our receptionist.",
            "error": str(e)
        }
