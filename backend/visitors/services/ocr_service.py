import cv2
import numpy as np
import pytesseract
import re
import requests
import threading
import time
from datetime import datetime
from typing import Optional, List, Dict, Tuple
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class NumberPlateOCR:
    """OCR service for detecting and reading vehicle number plates from RTSP camera feeds."""
    
    def __init__(self):
        self.plate_patterns = [
            # Standard formats: ABC-123-XYZ, 1234-ABC, ABC-1234
            r'^[A-Z]{2,3}-\d{3,4}-[A-Z]{0,3}$',
            r'^\d{3,4}-[A-Z]{2,3}$',
            r'^[A-Z]{2,3}-\d{3,4}$',
            # Custom formats
            r'^[A-Z]\d{7,8}$',
            r'^\d{2,4}[A-Z]{2,3}$',
            r'^[A-Z]{3}\d{3}$',
        ]
        
        # Preprocessing parameters
        self.gaussian_kernel = (5, 5)
        self.morph_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR accuracy."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, self.gaussian_kernel, 0)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to remove noise
        opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, self.morph_kernel, iterations=1)
        
        # Dilate to connect components
        dilated = cv2.dilate(opened, self.morph_kernel, iterations=1)
        
        return dilated
    
    def detect_plate_regions(self, image: np.ndarray) -> List[np.ndarray]:
        """Detect potential number plate regions in the image."""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Sobel operator to find edges
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        
        # Calculate magnitude
        magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        magnitude = np.uint8(magnitude / magnitude.max() * 255)
        
        # Apply threshold
        _, thresh = cv2.threshold(magnitude, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        plate_regions = []
        
        for contour in contours:
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter based on aspect ratio and area
            aspect_ratio = w / h
            area = cv2.contourArea(contour)
            
            # Typical number plate aspect ratios: 2.0 to 5.5
            if 2.0 <= aspect_ratio <= 5.5 and area > 500:
                # Additional filtering based on solidity
                hull = cv2.convexHull(contour)
                hull_area = cv2.contourArea(hull)
                solidity = float(area) / hull_area if hull_area > 0 else 0
                
                if solidity > 0.3:
                    # Extract region with some padding
                    padding = 10
                    x_start = max(0, x - padding)
                    y_start = max(0, y - padding)
                    x_end = min(image.shape[1], x + w + padding)
                    y_end = min(image.shape[0], y + h + padding)
                    
                    plate_region = image[y_start:y_end, x_start:x_end]
                    plate_regions.append(plate_region)
        
        return plate_regions
    
    def extract_text_from_region(self, region: np.ndarray) -> str:
        """Extract text from a detected plate region using OCR."""
        try:
            # Preprocess the region
            processed = self.preprocess_image(region)
            
            # Configure Tesseract for number plates
            config = r'--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            
            # Extract text
            text = pytesseract.image_to_string(processed, config=config)
            
            # Clean and validate the text
            text = text.strip().upper()
            
            # Validate against known patterns
            for pattern in self.plate_patterns:
                if re.match(pattern, text):
                    return text
            
            # If no pattern matches, try to extract alphanumeric characters
            cleaned = re.sub(r'[^A-Z0-9-]', '', text)
            if len(cleaned) >= 5 and len(cleaned) <= 10:
                return cleaned
                
        except Exception as e:
            logger.error(f"Error extracting text from plate region: {e}")
        
        return ""
    
    def detect_number_plate(self, image: np.ndarray) -> Optional[str]:
        """Detect and read number plate from an image."""
        try:
            # Detect potential plate regions
            plate_regions = self.detect_plate_regions(image)
            
            if not plate_regions:
                logger.warning("No potential plate regions detected")
                return None
            
            # Extract text from each region
            detected_plates = []
            for region in plate_regions:
                plate_text = self.extract_text_from_region(region)
                if plate_text:
                    detected_plates.append(plate_text)
            
            # Return the most confident result (first one for now)
            if detected_plates:
                return detected_plates[0]
                
        except Exception as e:
            logger.error(f"Error in number plate detection: {e}")
        
        return None


class RTSPCameraStream:
    """RTSP camera stream handler for real-time processing."""
    
    def __init__(self, rtsp_url: str):
        self.rtsp_url = rtsp_url
        self.cap = None
        self.is_running = False
        self.frame_callback = None
        self.thread = None
        
    def connect(self) -> bool:
        """Connect to RTSP stream."""
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            
            # Set buffer size to reduce latency
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Test connection
            ret, frame = self.cap.read()
            if ret:
                logger.info(f"Successfully connected to RTSP stream: {self.rtsp_url}")
                return True
            else:
                logger.error(f"Failed to read frame from RTSP stream: {self.rtsp_url}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to RTSP stream: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from RTSP stream."""
        self.is_running = False
        if self.thread:
            self.thread.join()
        
        if self.cap:
            self.cap.release()
            self.cap = None
        
        logger.info(f"Disconnected from RTSP stream: {self.rtsp_url}")
    
    def set_frame_callback(self, callback):
        """Set callback function for processed frames."""
        self.frame_callback = callback
    
    def start_stream(self):
        """Start processing the RTSP stream."""
        if not self.cap:
            if not self.connect():
                return False
        
        self.is_running = True
        self.thread = threading.Thread(target=self._process_stream)
        self.thread.daemon = True
        self.thread.start()
        
        logger.info(f"Started RTSP stream processing: {self.rtsp_url}")
        return True
    
    def _process_stream(self):
        """Process frames from RTSP stream."""
        ocr_service = NumberPlateOCR()
        from visitors.services.face_recognition_service import face_service
        last_detection_time = 0
        detection_cooldown = 2  # seconds between detections
        
        while self.is_running and self.cap:
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Failed to read frame from RTSP stream")
                time.sleep(0.1)
                continue
            
            current_time = time.time()
            
            # Perform OCR and Face detection at intervals
            if current_time - last_detection_time >= detection_cooldown:
                # 1. Number Plate Detection
                detected_plate = ocr_service.detect_number_plate(frame)
                
                # 2. Face Detection
                detected_faces = face_service.detect_faces(frame)
                
                if detected_plate or detected_faces:
                    logger.info(f"Detections: Plate={detected_plate}, Faces={len(detected_faces)}")
                    
                    # Call callback with detection results
                    if self.frame_callback:
                        self.frame_callback({
                            'plate': detected_plate,
                            'faces': detected_faces,
                            'timestamp': datetime.now(),
                            'frame': frame.copy()
                        })
                
                last_detection_time = current_time
    
    def get_current_frame(self) -> Optional[np.ndarray]:
        """Get current frame from stream."""
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None


class GateAutomationService:
    """Service for managing gate automation and vehicle access control."""
    
    def __init__(self):
        self.camera_streams = {}  # tenant_id -> RTSPCameraStream
        self.ocr_service = NumberPlateOCR()
        
    def start_monitoring(self, tenant_id: str, rtsp_url: str, callback=None):
        """Start monitoring gate for a tenant."""
        if tenant_id in self.camera_streams:
            logger.warning(f"Camera stream already active for tenant {tenant_id}")
            return False
        
        # Create and start camera stream
        stream = RTSPCameraStream(rtsp_url)
        
        if callback:
            stream.set_frame_callback(callback)
        
        if stream.start_stream():
            self.camera_streams[tenant_id] = stream
            logger.info(f"Started gate monitoring for tenant {tenant_id}")
            return True
        else:
            logger.error(f"Failed to start gate monitoring for tenant {tenant_id}")
            return False
    
    def stop_monitoring(self, tenant_id: str):
        """Stop monitoring gate for a tenant."""
        if tenant_id in self.camera_streams:
            self.camera_streams[tenant_id].disconnect()
            del self.camera_streams[tenant_id]
            logger.info(f"Stopped gate monitoring for tenant {tenant_id}")
            return True
        return False
    
    def process_plate_detection(self, tenant_id: str, detection_data: Dict):
        """Process a detected number plate and handle gate automation."""
        plate_number = detection_data['plate']
        timestamp = detection_data['timestamp']
        
        logger.info(f"Processing plate detection for tenant {tenant_id}: {plate_number}")
        
        # Check if this plate is authorized
        from visitors.models import Visitor, PreRegistration
        from visitors.tenant_models import Tenant
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Check for pre-registered visitors with this plate
            pre_reg = PreRegistration.objects.filter(
                tenant=tenant,
                visitor_number_plate__iexact=plate_number,
                status='PENDING'
            ).first()
            
            if pre_reg:
                self._authorize_access(tenant_id, plate_number, 'pre_registered', pre_reg)
                return
            
            # Check for returning visitors
            visitor = Visitor.objects.filter(
                tenant=tenant,
                number_plate__iexact=plate_number
            ).first()
            
            if visitor:
                self._authorize_access(tenant_id, plate_number, 'returning_visitor', visitor)
                return
            
            # Unknown plate - handle based on tenant settings
            self._handle_unknown_plate(tenant_id, plate_number, timestamp)
            
        except Exception as e:
            logger.error(f"Error processing plate detection: {e}")
    
    def _authorize_access(self, tenant_id: str, plate_number: str, access_type: str, related_object):
        """Authorize access and open gate."""
        try:
            # Log the access
            from visitors.security_models import GateAccessLog
            from visitors.tenant_models import Tenant
            
            tenant = Tenant.objects.get(id=tenant_id)
            
            GateAccessLog.objects.create(
                tenant=tenant,
                plate_number=plate_number,
                access_type=access_type,
                access_granted=True,
                related_visitor=related_object if hasattr(related_object, 'visitor_name') else None,
                related_pre_registration=related_object if hasattr(related_object, 'visitor_name') else None
            )
            
            # Send command to open gate
            self._open_gate(tenant_id)
            
            logger.info(f"Access granted for plate {plate_number} ({access_type})")
            
        except Exception as e:
            logger.error(f"Error authorizing access: {e}")
    
    def _handle_unknown_plate(self, tenant_id: str, plate_number: str, timestamp):
        """Handle unknown number plate detection."""
        try:
            from visitors.security_models import GateAccessLog
            from visitors.tenant_models import Tenant
            
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Log the unknown access attempt
            GateAccessLog.objects.create(
                tenant=tenant,
                plate_number=plate_number,
                access_type='unknown',
                access_granted=False,
            )
            
            # Check tenant settings for unknown plate handling
            from visitors.tenant_models import TenantSettings
            settings = TenantSettings.objects.get(tenant=tenant)
            
            if settings.gate_automation_enabled:
                # Could trigger alert, notification, etc.
                logger.warning(f"Unknown plate detected: {plate_number}")
            
        except Exception as e:
            logger.error(f"Error handling unknown plate: {e}")
    
    def _open_gate(self, tenant_id: str):
        """Send command to open gate."""
        try:
            from visitors.tenant_models import TenantSettings
            
            tenant_settings = TenantSettings.objects.get(tenant_id=tenant_id)
            gate_api = tenant_settings.gate_api_endpoint
            
            if gate_api:
                # Send HTTP request to gate API
                response = requests.post(
                    f"{gate_api}/open",
                    json={
                        'tenant_id': tenant_id,
                        'command': 'open',
                        'timestamp': datetime.now().isoformat()
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    logger.info(f"Gate opened successfully for tenant {tenant_id}")
                else:
                    logger.error(f"Failed to open gate: {response.status_code}")
            else:
                logger.warning(f"No gate API endpoint configured for tenant {tenant_id}")
                
        except Exception as e:
            logger.error(f"Error opening gate: {e}")
    
    def get_camera_frame(self, tenant_id: str) -> Optional[np.ndarray]:
        """Get current frame from camera."""
        if tenant_id in self.camera_streams:
            return self.camera_streams[tenant_id].get_current_frame()
        return None
    
    def is_monitoring_active(self, tenant_id: str) -> bool:
        """Check if monitoring is active for a tenant."""
        return tenant_id in self.camera_streams


# Global service instance
gate_service = GateAutomationService()
