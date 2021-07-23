import os
import time

from django.core.management.base import BaseCommand

from api.controllers import cloud_api
from api.models import Account
from notifications.models import Message

SLEEP_TIMER = 10


class Command(BaseCommand):
    help = "Adds an account to api_accounts. (This is used to create the first admin account)"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)
        parser.add_argument("password", type=str)

    def handle(self, *args, **options):
        if Account.objects.first() and not os.environ.get("LOCAL_ENV"):
            raise RuntimeError("This command should only be run if no accounts exists")
        if not options["email"]:
            raise ValueError("Missing email!")

        if not options["password"]:
            raise ValueError("Missing password!")

        email = options["email"]
        password = options["password"]
        first = email[0]
        last = email[1]
        cloud_api.Account.register("", email, password, first, last)
        account = Account.objects.create(email=email, first_name=first, last_name=last,
                                         is_superuser=True, is_staff=True, is_active=True)
        self.stdout.write(self.style.SUCCESS(f"Successfully added user with {email} for email."))

        self.stdout.write(self.style.NOTICE(f"Waiting for {SLEEP_TIMER}s to activate the account."))
        time.sleep(SLEEP_TIMER)

        message = Message.objects.filter(user_email__iexact=email).last()
        if message:
            cloud_api.Account.activate(message.message.get("code"))
            self.stdout.write(self.style.SUCCESS(f"Successfully activated {email}."))
        else:
            account.delete()
            self.stdout.write(
                self.style.ERROR(f"Failed to activate {email}. Deleting the account."
                                 f"Please try again. If it continues to fail please contact support."
                                 )
            )
