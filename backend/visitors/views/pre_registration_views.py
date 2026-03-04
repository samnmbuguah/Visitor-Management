from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import PreRegistration, Visitor, Host
from ..serializers.base_serializers import PreRegistrationSerializer, VisitorSerializer
from ..services.notifications import NotificationService
from rest_framework.permissions import IsAuthenticated, AllowAny

class PreRegistrationViewSet(viewsets.ModelViewSet):
    queryset = PreRegistration.objects.all().order_by('-expected_arrival')
    serializer_class = PreRegistrationSerializer
    
    def get_permissions(self):
        if self.action in ['scan', 'checkin']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        host_id = self.request.query_params.get('host')
        
        if status_param:
            queryset = queryset.filter(status=status_param)
        if host_id:
            queryset = queryset.filter(host_id=host_id)
            
        return queryset

    def perform_create(self, serializer):
        # Create the invite
        pre_reg = serializer.save()
        
        # Send email with QR code
        NotificationService.send_invite(pre_reg)

    @action(detail=False, methods=['post'])
    def scan(self, request):
        """
        Scan a QR code token and retrieve the pre-registration details.
        """
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            pre_reg = PreRegistration.objects.get(token=token)
        except PreRegistration.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)
            
        if pre_reg.status != 'PENDING':
            return Response({'error': f'Invite is {pre_reg.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = self.get_serializer(pre_reg)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def checkin(self, request, pk=None):
        """
        Convert a pre-registration into a checked-in visitor.
        """
        pre_reg = self.get_object()
        
        if pre_reg.status != 'PENDING':
            return Response({'error': 'Invite has already been used or cancelled'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create visitor
        try:
            visitor = Visitor.objects.create(
                name=pre_reg.visitor_name,
                email=pre_reg.visitor_email,
                phone=pre_reg.visitor_phone,
                company=pre_reg.visitor_company,
                host=pre_reg.host,
                location=pre_reg.location,
                purpose="Pre-registered Visit", # Or allow overriding
                pre_registration=pre_reg,
                status='CHECKED_IN'
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update pre-reg status
        pre_reg.status = 'USED'
        pre_reg.save()
        
        # Notify host
        NotificationService.notify_host_of_arrival(visitor)
        NotificationService.send_visitor_confirmation(visitor)

        return Response(VisitorSerializer(visitor).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """
        Bulk upload pre-registrations from a CSV file.
        CSV Columns: name, email, phone, company, expected_arrival, host_email (optional)
        """
        file = request.FILES.get('file')
        if not file:
             return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        import csv
        import io
        from datetime import datetime
        
        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return Response({'error': 'Invalid CSV file'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_count = 0
        errors = []
        row_index = 0
        
        # Determine default host/location from user
        current_host = None
        if hasattr(request.user, 'host_profile'):
            current_host = request.user.host_profile
            
        default_location = None
        if hasattr(request.user, 'profile') and request.user.profile.location:
             default_location = request.user.profile.location
        
        for row in reader:
            row_index += 1
            try:
                name = row.get('name')
                email = row.get('email')
                date_str = row.get('expected_arrival') # Format YYYY-MM-DD HH:MM
                
                if not name or not email or not date_str:
                    errors.append({'row': row_index, 'error': 'Missing required fields (name, email, expected_arrival)'})
                    continue
                    
                # Find Host
                host = current_host
                host_email = row.get('host_email')
                if host_email:
                    try:
                        host = Host.objects.get(email=host_email)
                    except Host.DoesNotExist:
                        errors.append({'row': row_index, 'error': f'Host not found: {host_email}'})
                        continue
                
                if not host:
                     errors.append({'row': row_index, 'error': 'No host specified and user is not a host'})
                     continue

                location = host.location or default_location
                if not location:
                     # Fallback to first location? No, error.
                     errors.append({'row': row_index, 'error': 'Location could not be determined'})
                     continue

                # Create PreRegistration
                pre_reg = PreRegistration.objects.create(
                    visitor_name=name,
                    visitor_email=email,
                    visitor_phone=row.get('phone', ''),
                    visitor_company=row.get('company', ''),
                    host=host,
                    location=location,
                    expected_arrival=datetime.strptime(date_str, '%Y-%m-%d %H:%M'),
                    status='PENDING'
                )
                
                NotificationService.send_invite(pre_reg)
                created_count += 1
                
            except Exception as e:
                errors.append({'row': row_index, 'error': str(e)})
        
        return Response({
            'created': created_count,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_400_BAD_REQUEST)
