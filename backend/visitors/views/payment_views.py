"""
API views for payment processing and subscription management.
"""

import json
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse

from visitors.payment_models import Customer, StripeSubscription, Invoice, PaymentMethod, Transaction
from visitors.services.payment_service import stripe_service
from visitors.tenant_models import Tenant, Subscription as TenantSubscription

logger = logging.getLogger(__name__)


class CreateCustomerView(APIView):
    """Create a Stripe customer for a tenant."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create customer."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Check if customer already exists
            if hasattr(tenant, 'stripe_customer'):
                return Response(
                    {'error': 'Customer already exists for this tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            data = request.data
            email = data.get('email')
            name = data.get('name')
            
            if not email or not name:
                return Response(
                    {'error': 'Email and name are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create Stripe customer
            stripe_customer = stripe_service.create_customer(
                email=email,
                name=name,
                tenant_id=str(tenant.id)
            )
            
            if not stripe_customer:
                return Response(
                    {'error': 'Failed to create Stripe customer'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Create customer record
            customer = Customer.objects.create(
                tenant=tenant,
                stripe_customer_id=stripe_customer['id'],
                email=email,
                name=name,
                phone=data.get('phone', ''),
                billing_address_line1=data.get('billing_address_line1', ''),
                billing_address_line2=data.get('billing_address_line2', ''),
                billing_city=data.get('billing_city', ''),
                billing_state=data.get('billing_state', ''),
                billing_postal_code=data.get('billing_postal_code', ''),
                billing_country=data.get('billing_country', '')
            )
            
            return Response({
                'message': 'Customer created successfully',
                'customer_id': str(customer.id),
                'stripe_customer_id': stripe_customer['id']
            })
            
        except Exception as e:
            logger.error(f"Error creating customer: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CreateSubscriptionView(APIView):
    """Create a subscription for a customer."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create subscription."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Check if customer exists
            if not hasattr(tenant, 'stripe_customer'):
                return Response(
                    {'error': 'No customer found for this tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            customer = tenant.stripe_customer
            
            # Check if subscription already exists
            if hasattr(tenant, 'stripe_subscription'):
                return Response(
                    {'error': 'Subscription already exists for this tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            data = request.data
            price_id = data.get('price_id')
            trial_period_days = data.get('trial_period_days', 0)
            
            if not price_id:
                return Response(
                    {'error': 'Price ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create Stripe subscription
            stripe_subscription = stripe_service.create_subscription(
                customer_id=customer.stripe_customer_id,
                price_id=price_id,
                trial_period_days=trial_period_days
            )
            
            if not stripe_subscription:
                return Response(
                    {'error': 'Failed to create Stripe subscription'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Create subscription record
            subscription = StripeSubscription.objects.create(
                tenant=tenant,
                customer=customer,
                stripe_subscription_id=stripe_subscription['id'],
                stripe_price_id=price_id,
                status=stripe_subscription['status'].upper(),
                current_period_start=timezone.make_aware(
                    timezone.datetime.fromtimestamp(stripe_subscription['current_period_start'])
                ),
                current_period_end=timezone.make_aware(
                    timezone.datetime.fromtimestamp(stripe_subscription['current_period_end'])
                ),
                trial_start=timezone.make_aware(
                    timezone.datetime.fromtimestamp(stripe_subscription['trial_start'])
                ) if stripe_subscription.get('trial_start') else None,
                trial_end=timezone.make_aware(
                    timezone.datetime.fromtimestamp(stripe_subscription['trial_end'])
                ) if stripe_subscription.get('trial_end') else None,
                cancel_at_period_end=stripe_subscription.get('cancel_at_period_end', False),
                latest_invoice_id=stripe_subscription.get('latest_invoice', ''),
                latest_invoice_status=stripe_subscription.get('latest_invoice_status', '')
            )
            
            # Update tenant subscription
            tenant_sub = tenant.subscription
            tenant_sub.stripe_subscription_id = stripe_subscription['id']
            tenant_sub.status = 'ACTIVE' if subscription.is_active else 'PENDING'
            tenant_sub.trial_ends_at = subscription.trial_end
            tenant_sub.save()
            
            # Return client secret for payment confirmation
            client_secret = None
            if stripe_subscription.get('latest_invoice') and stripe_subscription['latest_invoice'].get('payment_intent'):
                client_secret = stripe_subscription['latest_invoice']['payment_intent']['client_secret']
                
            return Response({
                'message': 'Subscription created successfully',
                'subscription_id': str(subscription.id),
                'client_secret': client_secret,
                'status': subscription.status,
                'current_period_end': subscription.current_period_end.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CancelSubscriptionView(APIView):
    """Cancel a subscription."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Cancel subscription."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Check if subscription exists
            if not hasattr(tenant, 'stripe_subscription'):
                return Response(
                    {'error': 'No subscription found for this tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            subscription = tenant.stripe_subscription
            at_period_end = request.data.get('at_period_end', True)
            
            # Cancel Stripe subscription
            stripe_subscription = stripe_service.cancel_subscription(
                subscription_id=subscription.stripe_subscription_id,
                at_period_end=at_period_end
            )
            
            if not stripe_subscription:
                return Response(
                    {'error': 'Failed to cancel Stripe subscription'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Update subscription record
            subscription.status = stripe_subscription['status'].upper()
            subscription.cancel_at_period_end = stripe_subscription.get('cancel_at_period_end', False)
            if stripe_subscription.get('canceled_at'):
                subscription.canceled_at = timezone.make_aware(
                    timezone.datetime.fromtimestamp(stripe_subscription['canceled_at'])
                )
            subscription.save()
            
            # Update tenant subscription
            tenant_sub = tenant.subscription
            tenant_sub.status = 'CANCELED'
            tenant_sub.canceled_at = timezone.now()
            tenant_sub.save()
            
            return Response({
                'message': 'Subscription canceled successfully',
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end
            })
            
        except Exception as e:
            logger.error(f"Error canceling subscription: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateSubscriptionView(APIView):
    """Update a subscription to a new price."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update subscription."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Check if subscription exists
            if not hasattr(tenant, 'stripe_subscription'):
                return Response(
                    {'error': 'No subscription found for this tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            subscription = tenant.stripe_subscription
            price_id = request.data.get('price_id')
            
            if not price_id:
                return Response(
                    {'error': 'Price ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Update Stripe subscription
            stripe_subscription = stripe_service.update_subscription(
                subscription_id=subscription.stripe_subscription_id,
                price_id=price_id
            )
            
            if not stripe_subscription:
                return Response(
                    {'error': 'Failed to update Stripe subscription'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Update subscription record
            subscription.stripe_price_id = price_id
            subscription.status = stripe_subscription['status'].upper()
            subscription.save()
            
            return Response({
                'message': 'Subscription updated successfully',
                'status': subscription.status,
                'new_price_id': price_id
            })
            
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscriptionStatusView(APIView):
    """Get subscription status."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get subscription status."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Get subscription details
            subscription_data = None
            if hasattr(tenant, 'stripe_subscription'):
                subscription = tenant.stripe_subscription
                subscription_data = {
                    'id': str(subscription.id),
                    'status': subscription.status,
                    'is_active': subscription.is_active,
                    'is_trialing': subscription.is_trialing,
                    'current_period_start': subscription.current_period_start.isoformat(),
                    'current_period_end': subscription.current_period_end.isoformat(),
                    'days_until_renewal': subscription.days_until_renewal,
                    'trial_days_remaining': subscription.trial_days_remaining,
                    'cancel_at_period_end': subscription.cancel_at_period_end,
                    'stripe_price_id': subscription.stripe_price_id
                }
                
            # Get customer details
            customer_data = None
            if hasattr(tenant, 'stripe_customer'):
                customer = tenant.stripe_customer
                customer_data = {
                    'id': str(customer.id),
                    'email': customer.email,
                    'name': customer.name,
                    'billing_address': customer.full_billing_address
                }
                
            # Get recent invoices
            invoices = Invoice.objects.filter(tenant=tenant).order_by('-created_at')[:5]
            invoice_data = []
            for invoice in invoices:
                invoice_data.append({
                    'id': str(invoice.id),
                    'stripe_invoice_id': invoice.stripe_invoice_id,
                    'status': invoice.status,
                    'amount': str(invoice.amount),
                    'currency': invoice.currency,
                    'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                    'paid_at': invoice.paid_at.isoformat() if invoice.paid_at else None,
                    'is_overdue': invoice.is_overdue
                })
                
            return Response({
                'subscription': subscription_data,
                'customer': customer_data,
                'recent_invoices': invoice_data
            })
            
        except Exception as e:
            logger.error(f"Error getting subscription status: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InvoicesView(APIView):
    """Get invoices for a tenant."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get invoices."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Get invoices
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            invoices = Invoice.objects.filter(tenant=tenant).order_by('-created_at')
            
            # Pagination
            start = (page - 1) * page_size
            end = start + page_size
            invoices_page = invoices[start:end]
            
            invoice_data = []
            for invoice in invoices_page:
                invoice_data.append({
                    'id': str(invoice.id),
                    'stripe_invoice_id': invoice.stripe_invoice_id,
                    'status': invoice.status,
                    'amount': str(invoice.amount),
                    'currency': invoice.currency,
                    'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                    'paid_at': invoice.paid_at.isoformat() if invoice.paid_at else None,
                    'is_overdue': invoice.is_overdue,
                    'days_overdue': invoice.days_overdue,
                    'period_start': invoice.period_start.isoformat(),
                    'period_end': invoice.period_end.isoformat()
                })
                
            return Response({
                'invoices': invoice_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': invoices.count(),
                    'pages': (invoices.count() + page_size - 1) // page_size
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting invoices: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UsageMetricsView(APIView):
    """Get usage metrics for billing."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get usage metrics."""
        try:
            # Get tenant for current user
            tenant_user = request.user.tenant_memberships.first()
            if not tenant_user:
                return Response(
                    {'error': 'User not associated with any tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            tenant = tenant_user.tenant
            
            # Get usage metrics
            metrics = stripe_service.get_usage_metrics(str(tenant.id))
            
            return Response(metrics)
            
        except Exception as e:
            logger.error(f"Error getting usage metrics: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhooks."""
    permission_classes = []  # No authentication required
    
    def post(self, request):
        """Handle webhook."""
        try:
            payload = request.body
            sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
            
            # Verify webhook signature
            event = stripe_service.process_webhook(payload, sig_header)
            if not event:
                return HttpResponse(
                    'Invalid signature',
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Handle subscription events
            if event['type'].startswith('customer.subscription'):
                success = stripe_service.handle_subscription_event(event)
                if success:
                    return HttpResponse(status=200)
                else:
                    return HttpResponse(
                        'Error handling event',
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                    
            # Handle invoice events
            elif event['type'].startswith('invoice'):
                success = stripe_service.handle_subscription_event(event)
                if success:
                    return HttpResponse(status=200)
                else:
                    return HttpResponse(
                        'Error handling invoice event',
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                    
            # Handle other events
            logger.info(f"Received webhook event: {event['type']}")
            return HttpResponse(status=200)
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return HttpResponse(
                'Internal server error',
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
