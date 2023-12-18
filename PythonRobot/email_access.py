import email
import email.policy
import email.message
import re
import time
from imaplib import IMAP4_SSL
from random import randint

from RobotVariables import RobotVariables

rb = RobotVariables("en_US")


def get_random_email(email=rb.BASE_EMAIL_SENDEMAIL, sendemail=False, extra="", symbols=False):
    if not sendemail:
        email = email.replace('sendemail', '')
    if symbols:
        index = email.find('@')
        email = email[:index] + \
                "!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
        return email
    else:
        index = email.find('@')
        email = email[:index] + str(time.time()) + str(randint(1, 100)) + extra + email[index:]
        return email


class EmailMessage:

    def __init__(self, message_uid: str, message_data: bytes):
        self.uid = message_uid
        self._message: email.message.EmailMessage = email.message_from_bytes(
            message_data,
            policy=email.policy.EmailPolicy(),
            )

    def get_subject(self):
        return self._message.get('Subject')

    def get_body(self):
        parts = []
        if self._message.is_multipart():
            for part in self._message.walk():
                if part.get_content_type() == 'text/html':
                    parts.append(part.get_content())
        else:
            parts.append(self._message.get_content())
        if len(parts) == 0:
            raise RuntimeError(f"Could not extract email body: message_uid={self.uid!r}")
        return ''.join(parts)

    def find_links_in_body(self, expected_links):
        for expected_link in expected_links:
            for link in self._get_links():
                if expected_link in link:
                    return
        else:
            raise RuntimeError(f"Expected link not found in email: {expected_link}")

    def get_activate_account_link(self):
        for link in self._get_links():
            if 'authorize/activate' in link:
                return link
        raise RuntimeError("Account activation link not found in the email body")

    def get_register_account_link(self):
        for link in self._get_links():
            if 'authorize/register' in link:
                return link
        raise RuntimeError("Password restoration link not found in the email body")

    def get_restore_password_link(self):
        for link in self._get_links():
            if 'authorize/restore_password' in link:
                return link
        raise RuntimeError("Password restoration link not found in the email body")

    def get_button_color(self, href_value) -> str:
        href_value = re.escape(href_value)
        pattern = rf'<a class="btn" href="{href_value}[^>]+?background-color: (#[A-F0-9]+);'
        match = re.search(pattern, self.get_body())
        return match.group(1)

    def is_cloud_name_present(self, cloud_name) -> bool:
        pattern = rf'<p.*?>[^<]*({cloud_name}).*<\/p>'
        return re.search(pattern, self.get_body()) is not None

    def _get_links(self):
        for url in re.finditer(r'href=[\'"]?([^\'" >]+)', self.get_body()):
            yield url.group(1)


class EmailClient:

    def __init__(self, email=rb.BASE_EMAIL, password=rb.BASE_EMAIL_PASSWORD, email_alias=None):
        self._email = email
        self._password = password
        self._alias = email_alias
        self._mailbox = IMAP4_SSL('imap.gmail.com', 993)

    def wait_for_reset_password_email(self, timeout=60) -> EmailMessage:
        return self.wait_for_email_subject('Reset', timeout=timeout)

    def wait_for_activate_account_email(self, timeout=60):
        return self.wait_for_email_subject("Activate your account", timeout=timeout)

    def wait_for_email_subject(self, subject: str, timeout=60) -> EmailMessage:
        return self._search(f'(TO "{self._alias}" SUBJECT "{subject}")', timeout)

    def delete_email(self, message: EmailMessage):
        self._mailbox.uid('STORE', message.uid, '+FLAGS', '(\\Deleted)')
        self._mailbox.expunge()

    def _search(self, query: str, timeout: float):
        # IMAPv4 Search command criteria: https://datatracker.ietf.org/doc/html/rfc1730.html#section-6.4.4
        started_at = time.monotonic()
        while True:
            self._mailbox.noop()
            status, data = self._mailbox.uid('search', None, query)
            if status != 'OK':
                raise RuntimeError(f"Unknown error while waiting for new emails: {data!r}")
            emails_uids = data[0].split()
            for email_uid in emails_uids:
                return self._fetch_message(email_uid)
            if time.monotonic() - started_at > timeout:
                raise TimeoutError("Timeout waiting for new emails")
            time.sleep(5)

    def _fetch_message(self, email_uid: str):
        status, msg_data = self._mailbox.uid('fetch', email_uid, '(RFC822)')
        if status != 'OK' or msg_data == [None]:
            raise RuntimeError(f"No email with UID: {email_uid}")
        self._mailbox.store(email_uid, '+FLAGS', '\\Seen')
        header, data = msg_data[0]
        return EmailMessage(email_uid, data)

    def _login(self):
        status, response = self._mailbox.login(self._email, self._password)
        if status != 'OK':
            raise RuntimeError(f"Failed to authenticate with the server. Response: {response}")
        status, response = self._mailbox.select('INBOX')
        if status != 'OK':
            raise RuntimeError(f"Failed to select INBOX. Response: {response}")

    def __enter__(self) -> 'EmailClient':
        self._login()
        return self

    def __exit__(self, *exc_details):
        self._mailbox.close()
