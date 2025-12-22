from django.db import models

class Host(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return self.name

class Visitor(models.Model):
    STATUS_CHOICES = [
        ('CHECKED_IN', 'Checked In'),
        ('CHECKED_OUT', 'Checked Out'),
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    host = models.ForeignKey(Host, on_delete=models.SET_NULL, null=True, related_name='visitors')
    purpose = models.TextField()
    photo = models.TextField(blank=True, help_text="Base64 encoded image")
    checkin_time = models.DateTimeField(auto_now_add=True)
    checkout_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CHECKED_IN')

    def __str__(self):
        return f"{self.name} - {self.checkin_time.date()}"
