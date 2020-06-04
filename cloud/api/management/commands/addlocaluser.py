import os

from django.core.management.base import BaseCommand

from ...models import Account


class Command(BaseCommand):
    help = "Adds an account to api_accounts. (This is for local dev only)"

    def add_arguments(self, parser):
        parser.add_argument('--email', nargs='?', type=str)

    def handle(self, *args, **options):
        if not os.environ.get("LOCAL_ENV"):
            raise RuntimeError("This command can only be ran locally!")
        if not options['email']:
            raise ValueError("Missing email!")

        email = options['email']
        first = email[0]
        last = email[1]
        Account(email=email, first_name=first, last_name=last, is_superuser=True, is_staff=True).save()
        self.stdout.write(self.style.SUCCESS(f'Successfully added user with {email} for email.'))
