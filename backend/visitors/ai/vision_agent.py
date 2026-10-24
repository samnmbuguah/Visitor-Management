import base64
import json
import logging
from typing import Dict, Any
from langchain_core.messages import HumanMessage
from .llm import get_chat_llm

logger = logging.getLogger(__name__)

VISION_EXTRACTION_PROMPT = """Analyze this image of a government ID, driver's license, visitor badge, or business card.
Extract the visitor's contact information accurately.

Return ONLY a valid JSON object with the following fields (leave string empty if not found):
{
  "name": "Full legal name or cardholder name",
  "company": "Organization or company name",
  "email": "Email address if visible",
  "phone": "Phone number if visible",
  "id_number": "Identification or license number if visible",
  "card_type": "BUSINESS_CARD" or "GOVERNMENT_ID" or "OTHER"
}
"""

def extract_visitor_card_info(image_base64: str) -> Dict[str, Any]:
    """
    Parses a visitor's ID or business card using a multimodal vision LLM.
    `image_base64` should be the raw base64 string or data URI (e.g. 'data:image/jpeg;base64,...').
    """
    try:
        # Strip data URL prefix if present
        clean_base64 = image_base64
        if "base64," in image_base64:
            clean_base64 = image_base64.split("base64,")[1]

        data_url = f"data:image/jpeg;base64,{clean_base64}"
        
        llm = get_chat_llm(model="openai/gpt-4o-mini", temperature=0.0, max_tokens=400)

        message = HumanMessage(
            content=[
                {"type": "text", "text": VISION_EXTRACTION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {"url": data_url}
                }
            ]
        )

        response = llm.invoke([message])
        content = response.content.strip()

        # Extract JSON from code blocks if enclosed
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        parsed = json.loads(content.strip())
        return {
            "success": True,
            "data": parsed
        }

    except Exception as e:
        logger.error(f"Error extracting visitor card info: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "data": {
                "name": "",
                "company": "",
                "email": "",
                "phone": "",
                "id_number": "",
                "card_type": "UNKNOWN"
            }
        }
