import qrcode
import io
import base64
from django.conf import settings

class QRCodeService:
    @staticmethod
    def generate_qr_code(data: str) -> str:
        """
        Generate a QR code for the given data and return it as a base64 encoded string.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        
        # Get base64 string
        img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_str}"
