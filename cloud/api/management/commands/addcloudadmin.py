import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.controllers import cloud_api
from api.helpers.exceptions import APINotFoundException, APINotAuthorisedException
from api.models import Account
from notifications.models import Message

SLEEP_TIMER = 10
CHECK_N_TIMES = 30


class Command(BaseCommand):
    help = "Adds an account to api_accounts. (This is used to create the first admin account)"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)
        parser.add_argument("password", type=str)

    def handle(self, *args, **options):
        if not (email := options.get('email', '')):
            raise ValueError("Missing email!")

        if not (password := options.get('password', '')):
            raise ValueError("Missing password!")

        first, last, *_ = email
        account, _ = Account.objects.get_or_create(email=email, first_name=first, last_name=last,
                                                   is_superuser=True, is_staff=True, is_active=True)
        try:
            cloud_api.Account.register(email, password, first, last)
            self.stdout.write(self.style.SUCCESS(
                f"Successfully created user with {email} for email."))
        except APINotFoundException:
            cloud_api.Account.reactivate(email)
            self.stdout.write(self.style.WARNING(
                f"User with {email} already exists."))

        for _ in range(CHECK_N_TIMES):  # SLEEP_TIMER * CHECK_N_TIMES = time waiting for email (Currently 300s)
            message = Message.objects.filter(user_email__iexact=email).last()
            if message:
                self.stdout.write(self.style.NOTICE(
                    f"Waiting for {SLEEP_TIMER}s to activate the account."))
                try:
                    cloud_api.Account.activate(message.message.get("code").replace("%3D", "=", 3))
                    account.activated_date = timezone.now()
                    account.save()
                    self.stdout.write(self.style.SUCCESS(
                        f"Successfully activated {email}."))
                    break
                except Exception as e:
                    if isinstance(e, APINotAuthorisedException):
                        self.stdout.write(self.style.WARNING(
                            f"{email} was already activated ."))
            time.sleep(SLEEP_TIMER)

        else:
            self.stdout.write(
                self.style.ERROR(f"Failed to activate {email}. Please check your inbox for {email} or try again. "
                                 f"If it continues to fail please contact support.")
            )
