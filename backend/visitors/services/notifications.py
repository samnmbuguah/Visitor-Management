from django.core.mail import EmailMultiAlternatives
from django.template import Template, Context
from django.conf import settings
from ..models import NotificationTemplate, NotificationLog, Visitor, Host


class NotificationService:
    """Service for sending notifications to hosts and visitors."""

    @staticmethod
    def _get_template(template_type: str, location_id: int = None) -> NotificationTemplate:
        """Get the active notification template for the given type and location."""
        # Try to find location-specific template first
        template = NotificationTemplate.objects.filter(
            type=template_type,
            is_active=True,
            location_id=location_id
        ).first()

        # Fall back to global template (no location)
        if not template:
            template = NotificationTemplate.objects.filter(
                type=template_type,
                is_active=True,
                location__isnull=True
            ).first()

        return template

    @staticmethod
    def _render_template(template_str: str, context: dict) -> str:
        """Render a template string with the given context."""
        try:
            template = Template(template_str)
            return template.render(Context(context))
        except Exception:
            # If template rendering fails, do simple string replacement
            result = template_str
            for key, value in context.items():
                result = result.replace('{{' + key + '}}', str(value))
                result = result.replace('{{ ' + key + ' }}', str(value))
            return result

    @staticmethod
    def _get_visitor_context(visitor: Visitor) -> dict:
        """Build template context from a visitor."""
        return {
            'visitor_name': visitor.name,
            'visitor_email': visitor.email,
            'visitor_phone': visitor.phone,
            'visitor_company': visitor.company or 'N/A',
            'purpose': visitor.purpose,
            'host_name': visitor.host.name if visitor.host else 'N/A',
            'host_email': visitor.host.email if visitor.host else 'N/A',
            'host_department': visitor.host.department if visitor.host else 'N/A',
            'checkin_time': visitor.checkin_time.strftime('%Y-%m-%d %H:%M') if visitor.checkin_time else 'N/A',
            'checkout_time': visitor.checkout_time.strftime('%Y-%m-%d %H:%M') if visitor.checkout_time else 'N/A',
            'location_name': visitor.location.name if visitor.location else 'Main Office',
        }

    @staticmethod
    def _send_email(
        recipient_email: str,
        subject: str,
        body: str,
        html_body: str = None,
        attachments: list = None,
        template: NotificationTemplate = None,
        visitor: Visitor = None,
        host: Host = None
    ) -> bool:
        """Send an email (plain text and optional HTML/attachments) and log the notification."""
        status = 'PENDING'
        error_message = ''

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )
            if html_body:
                msg.attach_alternative(html_body, "text/html")
            if attachments:
                for filename, content, mimetype in attachments:
                    msg.attach(filename, content, mimetype)
            msg.send()
            status = 'SENT'
        except Exception as e:
            status = 'FAILED'
            error_message = str(e)

        # Log the notification
        NotificationLog.objects.create(
            template=template,
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            status=status,
            error_message=error_message,
            visitor=visitor,
            host=host
        )

        return status == 'SENT'

    @classmethod
    def notify_host_of_arrival(cls, visitor: Visitor) -> bool:
        """Send notification to host when a visitor arrives."""
        if not visitor.host or not visitor.host.receive_notifications:
            return False

        template = cls._get_template(
            'VISITOR_ARRIVAL',
            visitor.location_id
        )

        context = cls._get_visitor_context(visitor)

        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
        else:
            # Default template
            subject = f"Visitor Arrival: {visitor.name}"
            body = f"""Hello {visitor.host.name},

You have a visitor waiting at the reception.

Visitor Details:
- Name: {visitor.name}
- Email: {visitor.email}
- Phone: {visitor.phone}
- Company: {visitor.company or 'N/A'}
- Purpose: {visitor.purpose}
- Check-in Time: {visitor.checkin_time.strftime('%Y-%m-%d %H:%M')}

Please proceed to the reception to meet your visitor.

Best regards,
Visitor Management System"""

        return cls._send_email(
            recipient_email=visitor.host.email,
            subject=subject,
            body=body,
            template=template,
            visitor=visitor,
            host=visitor.host
        )

    @classmethod
    def send_visitor_confirmation(cls, visitor: Visitor) -> bool:
        """Send confirmation email to visitor after check-in."""
        template = cls._get_template(
            'VISITOR_CONFIRMATION',
            visitor.location_id
        )

        context = cls._get_visitor_context(visitor)

        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
        else:
            # Default template
            subject = "Check-in Confirmation"
            body = f"""Hello {visitor.name},

Thank you for checking in. Your host {visitor.host.name if visitor.host else 'has'} been notified of your arrival.

Check-in Details:
- Time: {visitor.checkin_time.strftime('%Y-%m-%d %H:%M')}
- Host: {visitor.host.name if visitor.host else 'N/A'}
- Purpose: {visitor.purpose}

Please wait in the lobby area. Your host will be with you shortly.

Best regards,
Visitor Management System"""

        return cls._send_email(
            recipient_email=visitor.email,
            subject=subject,
            body=body,
            template=template,
            visitor=visitor,
            host=visitor.host
        )

    @classmethod
    def send_checkout_notification(cls, visitor: Visitor) -> bool:
        """Send notification to host when visitor checks out."""
        if not visitor.host or not visitor.host.receive_notifications:
            return False

        template = cls._get_template(
            'VISITOR_CHECKOUT',
            visitor.location_id
        )

        context = cls._get_visitor_context(visitor)

        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
        else:
            # Default template
            subject = f"Visitor Checkout: {visitor.name}"
            body = f"""Hello {visitor.host.name},

Your visitor {visitor.name} has checked out.

Visit Details:
- Check-in: {visitor.checkin_time.strftime('%Y-%m-%d %H:%M')}
- Check-out: {visitor.checkout_time.strftime('%Y-%m-%d %H:%M') if visitor.checkout_time else 'N/A'}

Best regards,
Visitor Management System"""

        return cls._send_email(
            recipient_email=visitor.host.email,
            subject=subject,
            body=body,
            template=template,
            visitor=visitor,
            host=visitor.host
        )

    @classmethod
    def send_overstay_alert(cls, visitor: Visitor) -> bool:
        """Send alert when visitor has overstayed their expected duration."""
        if not visitor.host:
            return False

        template = cls._get_template(
            'OVERSTAY_ALERT',
            visitor.location_id
        )

        context = cls._get_visitor_context(visitor)
        context['expected_duration'] = visitor.expected_duration or 'Not specified'

        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
        else:
            # Default template
            subject = f"Overstay Alert: {visitor.name}"
            body = f"""Hello {visitor.host.name},

Your visitor {visitor.name} has exceeded their expected visit duration.

Visit Details:
- Check-in: {visitor.checkin_time.strftime('%Y-%m-%d %H:%M')}
- Expected Duration: {visitor.expected_duration} minutes
- Current Status: Still checked in

Please ensure the visitor checks out when their visit is complete.

Best regards,
Visitor Management System"""

        return cls._send_email(
            recipient_email=visitor.host.email,
            subject=subject,
            body=body,
            template=template,
            visitor=visitor,
            host=visitor.host
        )

    @classmethod
    def send_invite(cls, pre_reg) -> bool:
        """Send invitation email with QR code and plain token to the visitor."""
        from .qrcode_service import QRCodeService
        import base64
        from io import BytesIO

        template = cls._get_template('PRE_REGISTRATION', pre_reg.location_id)
        
        # Generate QR code as PNG bytes
        qr_data = str(pre_reg.token)
        qr_image_data_uri = QRCodeService.generate_qr_code(qr_data)
        # Extract raw PNG bytes from data URI
        qr_png_bytes = base64.b64decode(qr_image_data_uri.split(',')[-1])
        
        context = {
            'visitor_name': pre_reg.visitor_name,
            'visitor_email': pre_reg.visitor_email,
            'host_name': pre_reg.host.name,
            'host_email': pre_reg.host.email,
            'location_name': pre_reg.location.name,
            'expected_arrival': pre_reg.expected_arrival.strftime('%Y-%m-%d %H:%M'),
            'token': pre_reg.token,
        }
        
        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
            html_body = cls._render_template(template.html_body if hasattr(template, 'html_body') else '', context)
        else:
            subject = f"Invitation to Visit {pre_reg.location.name}"
            body = f"""Hello {pre_reg.visitor_name},

You have been invited by {pre_reg.host.name} to visit our office at {pre_reg.location.name}.

Expected Arrival: {pre_reg.expected_arrival.strftime('%Y-%m-%d %H:%M')}

Please show the QR code or use the code below at the kiosk to check in.

Token: {pre_reg.token}

Best regards,
Visitor Management System"""
            html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invitation to Visit {pre_reg.location.name}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  <h2 style="color: #333;">Invitation to Visit {pre_reg.location.name}</h2>
  <p>Hello {pre_reg.visitor_name},</p>
  <p>You have been invited by <strong>{pre_reg.host.name}</strong> to visit our office at <strong>{pre_reg.location.name}</strong>.</p>
  <p><strong>Expected Arrival:</strong> {pre_reg.expected_arrival.strftime('%Y-%m-%d %H:%M')}</p>
  <p>Please show the QR code or use the code below at the kiosk to check in.</p>
  <div style="text-align: center; margin: 20px 0;">
    <img src="cid:qr_code" alt="QR Code" style="width: 200px; height: auto; border: 1px solid #ccc; padding: 8px; background: white;" />
  </div>
  <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; text-align: center; font-family: monospace; font-size: 16px; margin: 20px 0;">
    <strong>Token:</strong> {pre_reg.token}
  </div>
  <p>Best regards,<br>Visitor Management System</p>
</body>
</html>"""
        
        return cls._send_email(
            recipient_email=pre_reg.visitor_email,
            subject=subject,
            body=body,
            html_body=html_body,
            attachments=[('qr_code.png', qr_png_bytes, 'image/png')],
            template=template,
            host=pre_reg.host
        )

    @classmethod
    def notify_host_approval_required(cls, visitor: Visitor) -> bool:
        """Send notification to host that a visitor requires approval."""
        if not visitor.host or not visitor.host.receive_notifications:
            return False

        template = cls._get_template('VISITOR_APPROVAL_REQUIRED', visitor.location_id)
        
        context = cls._get_visitor_context(visitor)
        
        if template:
            subject = cls._render_template(template.subject, context)
            body = cls._render_template(template.body, context)
        else:
            subject = f"Action Required: Approve Visitor {visitor.name}"
            body = f"""Hello {visitor.host.name},

{visitor.name} has arrived and is waiting for your approval to enter.

Visitor Details:
- Name: {visitor.name}
- Email: {visitor.email}
- Company: {visitor.company or 'N/A'}
- Purpose: {visitor.purpose}

Please approve or reject this request.

Best regards,
Visitor Management System"""

        return cls._send_email(
            recipient_email=visitor.host.email,
            subject=subject,
            body=body,
            template=template,
            visitor=visitor,
            host=visitor.host
        )

