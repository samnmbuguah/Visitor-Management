"""
Serializers for payment models and APIs.
"""

from rest_framework import serializers
from visitors.payment_models import Customer, StripeSubscription, Invoice, PaymentMethod, Transaction


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for customer model."""
    
    class Meta:
        model = Customer
        fields = [
            'id', 'tenant', 'stripe_customer_id', 'email', 'name', 'phone',
            'billing_address_line1', 'billing_address_line2', 'billing_city',
            'billing_state', 'billing_postal_code', 'billing_country',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'stripe_customer_id', 'created_at', 'updated_at']


class CreateCustomerSerializer(serializers.Serializer):
    """Serializer for creating customers."""
    email = serializers.EmailField(required=True)
    name = serializers.CharField(max_length=200, required=True)
    phone = serializers.CharField(max_length=20, required=False)
    billing_address_line1 = serializers.CharField(max_length=200, required=False)
    billing_address_line2 = serializers.CharField(max_length=200, required=False)
    billing_city = serializers.CharField(max_length=100, required=False)
    billing_state = serializers.CharField(max_length=100, required=False)
    billing_postal_code = serializers.CharField(max_length=20, required=False)
    billing_country = serializers.CharField(max_length=2, required=False)


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscription model."""
    
    class Meta:
        model = StripeSubscription
        fields = [
            'id', 'tenant', 'customer', 'stripe_subscription_id', 'stripe_price_id',
            'status', 'current_period_start', 'current_period_end',
            'trial_start', 'trial_end', 'cancel_at_period_end',
            'canceled_at', 'ended_at', 'latest_invoice_id',
            'latest_invoice_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'customer', 'stripe_subscription_id', 'created_at', 'updated_at']


class CreateSubscriptionSerializer(serializers.Serializer):
    """Serializer for creating subscriptions."""
    price_id = serializers.CharField(required=True)
    trial_period_days = serializers.IntegerField(min_value=0, default=0)


class CancelSubscriptionSerializer(serializers.Serializer):
    """Serializer for canceling subscriptions."""
    at_period_end = serializers.BooleanField(default=True)


class UpdateSubscriptionSerializer(serializers.Serializer):
    """Serializer for updating subscriptions."""
    price_id = serializers.CharField(required=True)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoice model."""
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'tenant', 'customer', 'subscription', 'stripe_invoice_id',
            'status', 'amount', 'currency', 'due_date', 'period_start',
            'period_end', 'payment_intent_id', 'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'customer', 'subscription', 'stripe_invoice_id', 'created_at', 'updated_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment method model."""
    
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'customer', 'stripe_payment_method_id', 'type',
            'card_brand', 'card_last4', 'card_exp_month', 'card_exp_year',
            'bank_name', 'bank_last4', 'is_default', 'is_active',
            'display_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer', 'stripe_payment_method_id', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transaction model."""
    
    net_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'tenant', 'invoice', 'stripe_transaction_id', 'type',
            'status', 'amount', 'currency', 'application_fee',
            'stripe_fee', 'net_amount', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'invoice', 'stripe_transaction_id', 'net_amount', 'created_at', 'updated_at']


class UsageRecordSerializer(serializers.ModelSerializer):
    """Serializer for usage record model."""
    
    total_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Transaction  # Using Transaction as placeholder
        fields = [
            'id', 'tenant', 'metric_name', 'quantity', 'unit_price',
            'total_amount', 'period_start', 'period_end', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'tenant', 'total_amount', 'created_at']


class SubscriptionStatusSerializer(serializers.Serializer):
    """Serializer for subscription status response."""
    subscription = SubscriptionSerializer(read_only=True)
    customer = CustomerSerializer(read_only=True)
    recent_invoices = InvoiceSerializer(many=True, read_only=True)


class InvoiceListSerializer(serializers.Serializer):
    """Serializer for invoice list response."""
    invoices = InvoiceSerializer(many=True)
    pagination = serializers.DictField()


class UsageMetricsSerializer(serializers.Serializer):
    """Serializer for usage metrics response."""
    visitor_count = serializers.IntegerField()
    gate_access_count = serializers.IntegerField()
    month = serializers.CharField()
    plan_limits = serializers.DictField()


class WebhookEventSerializer(serializers.Serializer):
    """Serializer for webhook events."""
    event = serializers.DictField()
    type = serializers.CharField()
    created = serializers.IntegerField()
