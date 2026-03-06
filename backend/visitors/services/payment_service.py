"""
Stripe payment service for subscription billing.
Handles subscription creation, payment processing, and webhooks.
"""

import logging
import stripe
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any
from django.conf import settings
from django.utils import timezone as django_tz

logger = logging.getLogger(__name__)


class StripePaymentService:
    """Service for handling Stripe payments and subscriptions."""
    
    def __init__(self):
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
        self.webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
        self.development_mode = not stripe.api_key or stripe.api_key.startswith('sk_test_')
        
        if not stripe.api_key:
            logger.warning("Stripe API key not configured")
        elif self.development_mode:
            logger.info("Running in development mode with test Stripe key")
            
    def create_customer(self, email: str, name: str, tenant_id: str) -> Optional[Dict]:
        """
        Create a Stripe customer.
        
        Args:
            email: Customer email
            name: Customer name
            tenant_id: Tenant ID for metadata
            
        Returns:
            Stripe customer object or None if failed
        """
        try:
            if self.development_mode:
                # Return mock customer data for development
                return {
                    'id': f'cus_test_{tenant_id[:8]}',
                    'email': email,
                    'name': name,
                    'metadata': {
                        'tenant_id': tenant_id,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                }
                
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    'tenant_id': tenant_id,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
            )
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe customer: {e}")
            return None
            
    def create_subscription(self, customer_id: str, price_id: str, trial_period_days: int = 0) -> Optional[Dict]:
        """
        Create a subscription for a customer.
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            trial_period_days: Number of trial days
            
        Returns:
            Stripe subscription object or None if failed
        """
        try:
            subscription_data = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'payment_settings': {'save_default_payment_method': 'on_subscription'},
                'expand': ['latest_invoice.payment_intent'],
            }
            
            if trial_period_days > 0:
                subscription_data['trial_period_days'] = trial_period_days
                
            subscription = stripe.Subscription.create(**subscription_data)
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe subscription: {e}")
            return None
            
    def create_payment_intent(self, amount: int, currency: str = 'usd', customer_id: str = None) -> Optional[Dict]:
        """
        Create a payment intent for one-time payments.
        
        Args:
            amount: Amount in cents
            currency: Currency code
            customer_id: Stripe customer ID
            
        Returns:
            Stripe payment intent or None if failed
        """
        try:
            payment_intent_data = {
                'amount': amount,
                'currency': currency,
                'automatic_payment_methods': {'enabled': True},
            }
            
            if customer_id:
                payment_intent_data['customer'] = customer_id
                
            payment_intent = stripe.PaymentIntent.create(**payment_intent_data)
            return payment_intent
        except stripe.error.StripeError as e:
            logger.error(f"Error creating payment intent: {e}")
            return None
            
    def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> Optional[Dict]:
        """
        Cancel a subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            at_period_end: Whether to cancel at period end
            
        Returns:
            Updated subscription object or None if failed
        """
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=at_period_end
            )
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Error canceling subscription: {e}")
            return None
            
    def update_subscription(self, subscription_id: str, price_id: str) -> Optional[Dict]:
        """
        Update a subscription to a new price.
        
        Args:
            subscription_id: Stripe subscription ID
            price_id: New Stripe price ID
            
        Returns:
            Updated subscription object or None if failed
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Get the subscription item ID
            subscription_item_id = subscription['items']['data'][0].id
            
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': subscription_item_id,
                    'price': price_id,
                }],
                proration_behavior='create_prorations'
            )
            return updated_subscription
        except stripe.error.StripeError as e:
            logger.error(f"Error updating subscription: {e}")
            return None
            
    def get_customer_subscriptions(self, customer_id: str) -> list:
        """
        Get all subscriptions for a customer.
        
        Args:
            customer_id: Stripe customer ID
            
        Returns:
            List of subscription objects
        """
        try:
            subscriptions = stripe.Subscription.list(customer=customer_id)
            return subscriptions.data
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving subscriptions: {e}")
            return []
            
    def get_invoice(self, invoice_id: str) -> Optional[Dict]:
        """
        Get invoice details.
        
        Args:
            invoice_id: Stripe invoice ID
            
        Returns:
            Invoice object or None if failed
        """
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return invoice
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving invoice: {e}")
            return None
            
    def create_price(self, amount: int, currency: str = 'usd', interval: str = 'month', product_name: str = None) -> Optional[Dict]:
        """
        Create a price for a product.
        
        Args:
            amount: Amount in cents
            currency: Currency code
            interval: Billing interval (month, year)
            product_name: Product name for metadata
            
        Returns:
            Stripe price object or None if failed
        """
        try:
            price_data = {
                'unit_amount': amount,
                'currency': currency,
                'recurring': {'interval': interval},
            }
            
            if product_name:
                price_data['product_data'] = {
                    'name': product_name,
                    'metadata': {'created_for': 'visitor_management'}
                }
                
            price = stripe.Price.create(**price_data)
            return price
        except stripe.error.StripeError as e:
            logger.error(f"Error creating price: {e}")
            return None
            
    def process_webhook(self, payload: str, sig_header: str) -> Optional[Dict]:
        """
        Process Stripe webhook events.
        
        Args:
            payload: Webhook payload
            sig_header: Stripe signature header
            
        Returns:
            Event object or None if invalid
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return None
            
    def handle_subscription_event(self, event: Dict) -> bool:
        """
        Handle subscription-related webhook events.
        
        Args:
            event: Stripe event object
            
        Returns:
            True if handled successfully, False otherwise
        """
        try:
            event_type = event['type']
            
            if event_type == 'invoice.payment_succeeded':
                return self._handle_payment_succeeded(event)
            elif event_type == 'invoice.payment_failed':
                return self._handle_payment_failed(event)
            elif event_type == 'customer.subscription.created':
                return self._handle_subscription_created(event)
            elif event_type == 'customer.subscription.updated':
                return self._handle_subscription_updated(event)
            elif event_type == 'customer.subscription.deleted':
                return self._handle_subscription_deleted(event)
            else:
                logger.info(f"Unhandled event type: {event_type}")
                return True
                
        except Exception as e:
            logger.error(f"Error handling subscription event: {e}")
            return False
            
    def _handle_payment_succeeded(self, event: Dict) -> bool:
        """Handle successful payment event."""
        invoice = event['data']['object']
        logger.info(f"Payment succeeded for invoice {invoice['id']}")
        
        # Update tenant subscription status
        from visitors.tenant_models import Subscription as TenantSubscription
        
        try:
            subscription_id = invoice.get('subscription')
            if subscription_id:
                tenant_sub = TenantSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if tenant_sub:
                    tenant_sub.status = 'ACTIVE'
                    tenant_sub.last_payment_at = django_tz.now()
                    tenant_sub.save()
                    
        except Exception as e:
            logger.error(f"Error updating subscription after payment: {e}")
            return False
            
        return True
        
    def _handle_payment_failed(self, event: Dict) -> bool:
        """Handle failed payment event."""
        invoice = event['data']['object']
        logger.warning(f"Payment failed for invoice {invoice['id']}")
        
        # Update tenant subscription status
        from visitors.tenant_models import Subscription as TenantSubscription
        
        try:
            subscription_id = invoice.get('subscription')
            if subscription_id:
                tenant_sub = TenantSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if tenant_sub:
                    tenant_sub.status = 'PAST_DUE'
                    tenant_sub.save()
                    
        except Exception as e:
            logger.error(f"Error updating subscription after failed payment: {e}")
            return False
            
        return True
        
    def _handle_subscription_created(self, event: Dict) -> bool:
        """Handle subscription created event."""
        subscription = event['data']['object']
        logger.info(f"Subscription created: {subscription['id']}")
        return True
        
    def _handle_subscription_updated(self, event: Dict) -> bool:
        """Handle subscription updated event."""
        subscription = event['data']['object']
        logger.info(f"Subscription updated: {subscription['id']}")
        return True
        
    def _handle_subscription_deleted(self, event: Dict) -> bool:
        """Handle subscription deleted event."""
        subscription = event['data']['object']
        logger.info(f"Subscription deleted: {subscription['id']}")
        
        # Update tenant subscription status
        from visitors.tenant_models import Subscription as TenantSubscription
        
        try:
            tenant_sub = TenantSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).first()
            
            if tenant_sub:
                tenant_sub.status = 'CANCELED'
                tenant_sub.canceled_at = django_tz.now()
                tenant_sub.save()
                
        except Exception as e:
            logger.error(f"Error updating subscription after deletion: {e}")
            return False
            
        return True
        
    def get_usage_metrics(self, tenant_id: str) -> Dict:
        """
        Get usage metrics for billing.
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            Usage metrics dictionary
        """
        from visitors.models import Visitor, GateAccessLog
        from visitors.tenant_models import Tenant
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Get current month usage
            now = django_tz.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            visitor_count = Visitor.objects.filter(
                tenant=tenant,
                checkin_time__gte=month_start
            ).count()
            
            gate_access_count = GateAccessLog.objects.filter(
                tenant=tenant,
                detected_at__gte=month_start
            ).count()
            
            return {
                'visitor_count': visitor_count,
                'gate_access_count': gate_access_count,
                'month': now.strftime('%Y-%m'),
                'plan_limits': {
                    'visitors': getattr(tenant.subscription_plan, 'max_visitors', 'unlimited') if hasattr(tenant, 'subscription_plan') and tenant.subscription_plan else 'unlimited',
                    'gate_access': getattr(tenant.subscription_plan, 'max_gate_access', 'unlimited') if hasattr(tenant, 'subscription_plan') and tenant.subscription_plan else 'unlimited',
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting usage metrics: {e}")
            return {}


# Singleton instance
stripe_service = StripePaymentService()
