import json
import logging
from typing import Dict, Any, Optional
from langchain_core.messages import HumanMessage
from visitors.models import Visitor
from .llm import get_chat_llm

logger = logging.getLogger(__name__)

FACE_COMPARE_PROMPT = """You are a biometric facial verification engine for enterprise access control.
Compare the "LIVE_FACE" photo with each numbered "REFERENCE_PROFILE" photo.

Determine if the person in LIVE_FACE is the EXACT same individual as one of the reference candidates.
Take into account lighting, slight angle variations, and hair changes, but verify core facial features (eyes, nose, jawline).

Return ONLY valid JSON:
{
  "matched": true or false,
  "matched_candidate_index": 0 to N (or null if no match),
  "confidence": 0.0 to 1.0,
  "reasoning": "brief justification"
}
"""

def identify_visitor_by_face(live_image_base64: str) -> Dict[str, Any]:
    """
    Identifies a returning visitor by comparing the live kiosk webcam photo against
    the database of registered visitor photos.
    """
    try:
        # Fetch candidate visitors with stored photos
        candidates = Visitor.objects.exclude(photo='').exclude(photo__isnull=True).order_by('-checkin_time')[:5]

        candidate_list = []
        seen_emails = set()
        for c in candidates:
            if c.email not in seen_emails and c.photo and len(c.photo) > 50:
                seen_emails.add(c.email)
                candidate_list.append(c)

        if not candidate_list:
            return {
                "matched": False,
                "message": "No registered visitor profiles available for biometric comparison."
            }

        clean_live = live_image_base64
        if "base64," in clean_live:
            clean_live = clean_live.split("base64,")[1]
        live_data_url = f"data:image/jpeg;base64,{clean_live}"

        content_parts = [
            {"type": "text", "text": FACE_COMPARE_PROMPT},
            {"type": "text", "text": "=== LIVE_FACE FROM KIOSK ==="},
            {"type": "image_url", "image_url": {"url": live_data_url}}
        ]

        for idx, cand in enumerate(candidate_list):
            cand_photo = cand.photo
            if "base64," in cand_photo:
                cand_photo = cand_photo.split("base64,")[1]
            cand_url = f"data:image/jpeg;base64,{cand_photo}"

            content_parts.append({"type": "text", "text": f"=== REFERENCE_PROFILE [{idx}]: {cand.name} ({cand.email}) ==="})
            content_parts.append({"type": "image_url", "image_url": {"url": cand_url}})

        llm = get_chat_llm(model="openai/gpt-4o-mini", temperature=0.0, max_tokens=300)
        response = llm.invoke([HumanMessage(content=content_parts)])

        raw_text = response.content.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        parsed = json.loads(raw_text.strip())

        if parsed.get("matched") and parsed.get("matched_candidate_index") is not None:
            match_idx = int(parsed["matched_candidate_index"])
            if 0 <= match_idx < len(candidate_list):
                matched_visitor = candidate_list[match_idx]
                return {
                    "matched": True,
                    "confidence": parsed.get("confidence", 0.95),
                    "visitor": {
                        "id": matched_visitor.id,
                        "name": matched_visitor.name,
                        "email": matched_visitor.email,
                        "phone": matched_visitor.phone,
                        "company": matched_visitor.company,
                        "host_id": matched_visitor.host.id if matched_visitor.host else None,
                        "host_name": matched_visitor.host.name if matched_visitor.host else "",
                        "location_id": matched_visitor.location.id if matched_visitor.location else None
                    },
                    "message": f"Biometric face matched: {matched_visitor.name} ({parsed.get('confidence', 0.95):.0%} match)"
                }

        return {
            "matched": False,
            "message": "Face did not match any active visitor records."
        }

    except Exception as e:
        logger.error(f"Error during facial verification: {str(e)}", exc_info=True)
        return {
            "matched": False,
            "error": str(e),
            "message": "Facial verification error. Please use manual lookup."
        }
