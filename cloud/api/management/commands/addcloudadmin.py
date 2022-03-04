from django.core.management.base import BaseCommand
from django.utils import timezone

from cloud.controllers import cloud_api
from cloud.helpers.exceptions import APINotFoundException, APINotAuthorisedException
from api.models import Account
from notifications.models import Message


class Command(BaseCommand):
    help = "Adds an account to api_accounts. (This is used to create the first admin account)"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)
        parser.add_argument("password", type=str)

    def activate_account(self, account):
        message = Message.objects.filter(
            user_email__iexact=account.email).last()
        code = message.message.get("code") if message else ""
        if code:
            try:
                cloud_api.Account.activate(code.replace("%3D", "=", 3))
                account.activated_date = timezone.now()
                account.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Successfully activated {account.email}."))
            except Exception as e:
                if isinstance(e, APINotAuthorisedException):
                    self.stdout.write(self.style.WARNING(
                        f"{account.email} was already activated ."))
        else:
            self.stdout.write(self.style.WARNING(
                f"Cloud could not find the activation email for {account.email}.\n"
                f"Please try to login once cloud is running.\n"
                f"Then you can request for another activation code.\n")
            )

    def create_and_register(self, account, email, password):
        first, last, *_ = email
        account.first_name = first
        account.last_name = last
        account.is_superuser = True
        account.is_staff = True
        account.is_active = True
        account.save()

        try:
            cloud_api.Account.register(email, password, first, last)
            self.stdout.write(self.style.SUCCESS(
                f"Successfully created user with {email} for email."))
        except APINotFoundException:
            cloud_api.Account.reactivate(email)
            self.stdout.write(self.style.WARNING(
                f"User with {email} already exists."))

    def handle(self, *args, **options):
        if not (email := options.get('email', '')):
            raise ValueError("Missing email!")

        if not (password := options.get('password', '')):
            raise ValueError("Missing password!")

        account, created = Account.objects.get_or_create(email=email)

        if created:
            self.create_and_register(account, email, password)
        else:
            self.stdout.write(self.style.NOTICE(
                f"Account with {email} already exists. Skipping registration."))

        if not account.activated_date:
            self.activate_account(account)
        else:
            self.stdout.write(self.style.NOTICE(
                f"Account with {email} has already been activated."))
