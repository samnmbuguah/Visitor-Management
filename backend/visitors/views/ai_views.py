from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
import uuid
import logging

from visitors.models import Visitor
from visitors.ai.kiosk_agent import run_kiosk_agent
from visitors.ai.copilot_agent import run_copilot_agent
from visitors.ai.vision_agent import extract_visitor_card_info
from visitors.ai.briefing_agent import generate_host_briefing
from visitors.ai.face_verification import identify_visitor_by_face

logger = logging.getLogger(__name__)

class KioskAgentChatView(APIView):
    """
    Public conversational endpoint for the lobby kiosk tablet.
    Accepts natural language text or transcribed voice messages and
    executes LangGraph agent reasoning with tool calling.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id') or str(uuid.uuid4())

        if not message:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = run_kiosk_agent(session_id=session_id, message=message)
        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)


class FrontDeskCopilotChatView(APIView):
    """
    Authenticated copilot endpoint for receptionists and security administrators.
    Provides real-time analytics, overstay detection, and visitor log queries.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id') or f"user_{request.user.id}"

        if not message:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = run_copilot_agent(session_id=session_id, message=message)
        return Response(result, status=status.HTTP_200_OK)


class CardExtractionView(APIView):
    """
    Multimodal vision endpoint for scanning government IDs and business cards.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        image_data = request.data.get('image', '').strip()

        if not image_data:
            return Response(
                {"error": "Base64 image data is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = extract_visitor_card_info(image_data)
        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)


class FaceVerificationView(APIView):
    """
    Biometric face recognition check-in for returning visitors.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        image_data = request.data.get('image', '').strip()

        if not image_data:
            return Response(
                {"error": "Live face image data is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = identify_visitor_by_face(image_data)
        return Response(result, status=status.HTTP_200_OK)


class VisitorBriefingView(APIView):
    """
    Generates or retrieves the AI executive briefing for an arriving visitor.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        visitor_id = request.data.get('visitor_id')
        if not visitor_id:
            return Response(
                {"error": "visitor_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            visitor = Visitor.objects.get(id=visitor_id)
            briefing = visitor.ai_briefing
            if not briefing:
                briefing = generate_host_briefing(visitor)

            return Response(
                {"visitor_id": visitor.id, "briefing": briefing},
                status=status.HTTP_200_OK
            )
        except Visitor.DoesNotExist:
            return Response(
                {"error": "Visitor not found."},
                status=status.HTTP_404_NOT_FOUND
            )
