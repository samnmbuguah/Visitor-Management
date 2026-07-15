import logging
import traceback

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        logger.error(
            "API Exception: %s | %s %s | User: %s | Detail: %s",
            exc.__class__.__name__,
            context["request"].method,
            context["request"].path,
            context["request"].user,
            response.data,
        )
    else:
        logger.critical(
            "Unhandled Exception: %s | %s %s | User: %s | Traceback: %s",
            exc.__class__.__name__,
            context["request"].method,
            context["request"].path,
            context["request"].user,
            traceback.format_exc(),
        )
        response = Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
