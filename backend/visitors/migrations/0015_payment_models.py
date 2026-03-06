# Generated migration for payment models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('visitors', '0014_alter_emailnotificationlog_host_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_customer_id', models.CharField(max_length=100, unique=True)),
                ('email', models.EmailField(max_length=254)),
                ('name', models.CharField(max_length=200)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('billing_address_line1', models.CharField(blank=True, max_length=200)),
                ('billing_address_line2', models.CharField(blank=True, max_length=200)),
                ('billing_city', models.CharField(blank=True, max_length=100)),
                ('billing_state', models.CharField(blank=True, max_length=100)),
                ('billing_postal_code', models.CharField(blank=True, max_length=20)),
                ('billing_country', models.CharField(blank=True, max_length=2)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_customer', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='StripeSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_subscription_id', models.CharField(max_length=100, unique=True)),
                ('stripe_price_id', models.CharField(max_length=100)),
                ('status', models.CharField(choices=[('INCOMPLETE', 'Incomplete'), ('INCOMPLETE_EXPIRED', 'Incomplete Expired'), ('TRIALING', 'Trialing'), ('ACTIVE', 'Active'), ('PAST_DUE', 'Past Due'), ('CANCELED', 'Canceled'), ('UNPAID', 'Unpaid')], max_length=20)),
                ('current_period_start', models.DateTimeField()),
                ('current_period_end', models.DateTimeField()),
                ('trial_start', models.DateTimeField(blank=True, null=True)),
                ('trial_end', models.DateTimeField(blank=True, null=True)),
                ('cancel_at_period_end', models.BooleanField(default=False)),
                ('canceled_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('latest_invoice_id', models.CharField(blank=True, max_length=100)),
                ('latest_invoice_status', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='visitors.customer')),
                ('tenant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='stripe_subscription', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_invoice_id', models.CharField(max_length=100, unique=True)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('OPEN', 'Open'), ('PAID', 'Paid'), ('UNCOLLECTIBLE', 'Uncollectible'), ('VOID', 'Void')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='usd', max_length=3)),
                ('due_date', models.DateTimeField(blank=True, null=True)),
                ('period_start', models.DateTimeField()),
                ('period_end', models.DateTimeField()),
                ('payment_intent_id', models.CharField(blank=True, max_length=100)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='visitors.customer')),
                ('subscription', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invoices', to='visitors.subscription')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PaymentMethod',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_payment_method_id', models.CharField(max_length=100, unique=True)),
                ('type', models.CharField(choices=[('CARD', 'Card'), ('BANK_ACCOUNT', 'Bank Account')], max_length=20)),
                ('card_brand', models.CharField(blank=True, max_length=50)),
                ('card_last4', models.CharField(blank=True, max_length=4)),
                ('card_exp_month', models.IntegerField(blank=True, null=True)),
                ('card_exp_year', models.IntegerField(blank=True, null=True)),
                ('bank_name', models.CharField(blank=True, max_length=100)),
                ('bank_last4', models.CharField(blank=True, max_length=4)),
                ('is_default', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_methods', to='visitors.customer')),
            ],
            options={
                'ordering': ['-is_default', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('stripe_transaction_id', models.CharField(max_length=100, unique=True)),
                ('type', models.CharField(choices=[('PAYMENT', 'Payment'), ('REFUND', 'Refund'), ('CHARGEBACK', 'Chargeback'), ('DISPUTE', 'Dispute')], max_length=20)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('SUCCEEDED', 'Succeeded'), ('FAILED', 'Failed'), ('CANCELED', 'Canceled')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='usd', max_length=3)),
                ('application_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('stripe_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('invoice', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transactions', to='visitors.invoice')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='UsageRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('metric_name', models.CharField(max_length=100)),
                ('quantity', models.IntegerField()),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('period_start', models.DateTimeField()),
                ('period_end', models.DateTimeField()),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('subscription', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usage_records', to='visitors.subscription')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usage_records', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-period_start'],
            },
        ),
    ]
