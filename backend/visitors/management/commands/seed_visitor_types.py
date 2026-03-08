from django.core.management.base import BaseCommand
from visitors.models import VisitorType


class Command(BaseCommand):
    help = 'Seed common visitor types for visit reasons'

    def handle(self, *args, **options):
        # Common visitor types for property management
        visitor_types = [
            {
                'name': 'Business Meeting',
                'description': 'Scheduled business meetings with staff'
            },
            {
                'name': 'Delivery',
                'description': 'Package or document delivery'
            },
            {
                'name': 'Maintenance',
                'description': 'Maintenance or repair services'
            },
            {
                'name': 'Interview',
                'description': 'Job interviews or candidate meetings'
            },
            {
                'name': 'Tour',
                'description': 'Property tours or site visits'
            },
            {
                'name': 'Consultation',
                'description': 'Professional consultations or services'
            },
            {
                'name': 'Training',
                'description': 'Training sessions or workshops'
            },
            {
                'name': 'Inspection',
                'description': 'Safety or compliance inspections'
            },
            {
                'name': 'Installation',
                'description': 'Equipment or system installation'
            },
            {
                'name': 'Client Visit',
                'description': 'Client meetings or presentations'
            },
            {
                'name': 'Vendor Meeting',
                'description': 'Meetings with vendors or suppliers'
            },
            {
                'name': 'Personal Visit',
                'description': 'Personal visits to staff members'
            },
            {
                'name': 'Legal/Counsel',
                'description': 'Legal consultations or meetings'
            },
            {
                'name': 'Audit',
                'description': 'Financial or operational audits'
            },
            {
                'name': 'Other',
                'description': 'Other visit reasons not listed above'
            }
        ]

        created_count = 0
        updated_count = 0

        for visitor_type_data in visitor_types:
            visitor_type, created = VisitorType.objects.get_or_create(
                name=visitor_type_data['name'],
                defaults={
                    'description': visitor_type_data['description'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created visitor type: {visitor_type.name}')
                )
            else:
                # Update description if it exists
                visitor_type.description = visitor_type_data['description']
                visitor_type.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated visitor type: {visitor_type.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nVisitor types seeding complete!\n'
                f'Created: {created_count} new types\n'
                f'Updated: {updated_count} existing types\n'
                f'Total: {VisitorType.objects.count()} visitor types available'
            )
        )
