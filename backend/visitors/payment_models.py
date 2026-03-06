"""
Models for payment processing and subscription management.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

User = get_user_model()


class Customer(models.Model):
    """Stripe customer model linked to tenant."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        'visitors.Tenant',
        on_delete=models.CASCADE,
        related_name='stripe_customer'
    )
    stripe_customer_id = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    
    # Billing address
    billing_address_line1 = models.CharField(max_length=200, blank=True)
    billing_address_line2 = models.CharField(max_length=200, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_postal_code = models.CharField(max_length=20, blank=True)
    billing_country = models.CharField(max_length=2, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name} ({self.tenant.name})"
        
    @property
    def full_billing_address(self):
        """Get full billing address."""
        parts = [
            self.billing_address_line1,
            self.billing_address_line2,
            f"{self.billing_city}, {self.billing_state} {self.billing_postal_code}",
            self.billing_country
        ]
        return ', '.join(filter(None, parts))


class StripeSubscription(models.Model):
    """Stripe subscription model."""
    
    STATUS_CHOICES = [
        ('INCOMPLETE', 'Incomplete'),
        ('INCOMPLETE_EXPIRED', 'Incomplete Expired'),
        ('TRIALING', 'Trialing'),
        ('ACTIVE', 'Active'),
        ('PAST_DUE', 'Past Due'),
        ('CANCELED', 'Canceled'),
        ('UNPAID', 'Unpaid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        'visitors.Tenant',
        on_delete=models.CASCADE,
        related_name='stripe_subscription'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    
    # Stripe details
    stripe_subscription_id = models.CharField(max_length=100, unique=True)
    stripe_price_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # StripeSubscription period
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    
    # Cancellation
    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Payment
    latest_invoice_id = models.CharField(max_length=100, blank=True)
    latest_invoice_status = models.CharField(max_length=50, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['current_period_end']),
        ]
        
    def __str__(self):
        return f"{self.tenant.name} - {self.status}"
        
    @property
    def is_active(self):
        """Check if subscription is active."""
        return self.status in ['ACTIVE', 'TRIALING']
        
    @property
    def is_trialing(self):
        """Check if subscription is in trial period."""
        return self.status == 'TRIALING' and self.trial_end and self.trial_end > timezone.now()
        
    @property
    def days_until_renewal(self):
        """Get days until next renewal."""
        if self.cancel_at_period_end or not self.current_period_end:
            return None
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)
        
    @property
    def trial_days_remaining(self):
        """Get remaining trial days."""
        if not self.is_trialing or not self.trial_end:
            return 0
        delta = self.trial_end - timezone.now()
        return max(0, delta.days)


class Invoice(models.Model):
    """Stripe invoice model."""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('OPEN', 'Open'),
        ('PAID', 'Paid'),
        ('UNCOLLECTIBLE', 'Uncollectible'),
        ('VOID', 'Void'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'visitors.Tenant',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    subscription = models.ForeignKey(
        StripeSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    
    # Stripe details
    stripe_invoice_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='usd')
    
    # Dates
    due_date = models.DateTimeField(null=True, blank=True)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Payment
    payment_intent_id = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
        ]
        
    def __str__(self):
        return f"Invoice {self.stripe_invoice_id} - {self.status}"
        
    @property
    def is_overdue(self):
        """Check if invoice is overdue."""
        return (
            self.status == 'OPEN' and 
            self.due_date and 
            self.due_date < timezone.now()
        )
        
    @property
    def days_overdue(self):
        """Get days overdue."""
        if not self.is_overdue:
            return 0
        delta = timezone.now() - self.due_date
        return delta.days


class PaymentMethod(models.Model):
    """Customer payment methods."""
    
    TYPE_CHOICES = [
        ('CARD', 'Card'),
        ('BANK_ACCOUNT', 'Bank Account'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    # Stripe details
    stripe_payment_method_id = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Card details (if applicable)
    card_brand = models.CharField(max_length=50, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_exp_month = models.IntegerField(null=True, blank=True)
    card_exp_year = models.IntegerField(null=True, blank=True)
    
    # Bank details (if applicable)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_last4 = models.CharField(max_length=4, blank=True)
    
    # Status
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        
    def __str__(self):
        if self.type == 'CARD':
            return f"{self.card_brand} ****{self.card_last4}"
        elif self.type == 'BANK_ACCOUNT':
            return f"{self.bank_name} ****{self.bank_last4}"
        return f"Payment Method {self.stripe_payment_method_id[:8]}"
        
    @property
    def display_name(self):
        """Get human-readable payment method name."""
        if self.type == 'CARD':
            return f"{self.card_brand.title()} ending in {self.card_last4}"
        elif self.type == 'BANK_ACCOUNT':
            return f"{self.bank_name} ending in {self.bank_last4}"
        return "Payment Method"


class Transaction(models.Model):
    """Payment transactions for audit trail."""
    
    TYPE_CHOICES = [
        ('PAYMENT', 'Payment'),
        ('REFUND', 'Refund'),
        ('CHARGEBACK', 'Chargeback'),
        ('DISPUTE', 'Dispute'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCEEDED', 'Succeeded'),
        ('FAILED', 'Failed'),
        ('CANCELED', 'Canceled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'visitors.Tenant',
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Transaction details
    stripe_transaction_id = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='usd')
    
    # Fees
    application_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stripe_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Metadata
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['type']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        return f"{self.type} - {self.amount} {self.currency} ({self.status})"
        
    @property
    def net_amount(self):
        """Get net amount after fees."""
        return self.amount - self.application_fee - self.stripe_fee


class UsageRecord(models.Model):
    """Usage tracking for metered billing."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'visitors.Tenant',
        on_delete=models.CASCADE,
        related_name='usage_records'
    )
    subscription = models.ForeignKey(
        StripeSubscription,
        on_delete=models.CASCADE,
        related_name='usage_records'
    )
    
    # Usage details
    metric_name = models.CharField(max_length=100)  # e.g., 'visitors', 'gate_access'
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Metadata
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-period_start']
        unique_together = ['tenant', 'metric_name', 'period_start', 'period_end']
        
    def __str__(self):
        return f"{self.tenant.name} - {self.metric_name}: {self.quantity}"
        
    @property
    def total_amount(self):
        """Calculate total amount for this usage record."""
        return self.quantity * self.unit_price
