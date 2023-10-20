import email
import email.policy
import email.message
import quopri
import re
import time
from imaplib import IMAP4_SSL
from random import randint
from time import sleep

from RobotVariables import RobotVariables

rb = RobotVariables("en_US")


class Email:

    def __init__(self, user_email=rb.BASE_EMAIL, email_alias=None):
        # this is a load bearing sleep. Don't remove it.
        sleep(5)
        self.user_email = user_email
        self.email_alias = email_alias
        self.mailbox = IMAP4_SSL("imap.gmail.com", 993)

    def login(self):
        if not self._is_connected():
            self.mailbox = IMAP4_SSL("imap.gmail.com", 993)
        try:
            status, response = self.mailbox.login(self.user_email, rb.BASE_EMAIL_PASSWORD)
        except Exception as e:
            print(f"Login failed! Exception: {e}")
            raise e

        if status != 'OK':
            raise Exception(f"Failed to authenticate with the server! Response: {response}")

        status, response = self.mailbox.select("INBOX")
        if status != 'OK':
            raise Exception(f"Failed to select INBOX! Response: {response}")

    def _is_connected(self):
        try:
            # NOOP will maintain the connection active and
            # throw an error if the connection is lost or mailbox is in an invalid state.
            status, _ = self.mailbox.noop()
            return status == 'OK'
        except:
            return False

    def logout(self):
        if self.mailbox:
            self.mailbox.logout()

    def check_email_subject(self, email_id, subject):
        self.login()
        status, ids = self.mailbox.search(None, f'(SUBJECT "{subject}")')
        if status == "OK":
            id_list = ids[0].decode().split()
            for email_id in id_list:
                status, msg_data = self.mailbox.fetch(str(email_id), "(RFC822)")
                if status == "OK":
                    self.email_body = quopri.decodestring(msg_data[0][1]).decode("utf-8", errors="ignore")
                    self.logout()
                    return True
        self.logout()
        return False

    def get_body(self, email_id):
        self.login()
        email_id_str = email_id.decode('utf-8')
        status, msg_data = self.mailbox.uid('fetch', email_id_str, "(RFC822)")
        if status == "OK":
            self.email_body = quopri.decodestring(msg_data[0][1]).decode("utf-8", errors="ignore")
            self.logout()
            return self.email_body
        self.logout()
        return False

    def get_email_link(self, recipient, link_type, timeout=120):
        email_uid = None
        if link_type == "restore_password":
            email_uid = self.wait_for_email(recipient, rb.RESET_PASSWORD_EMAIL_SUBJECT, timeout=timeout)
        if link_type == 'activate':
            email_uid = self.wait_for_email(recipient, rb.ACTIVATE_YOUR_ACCOUNT_EMAIL_SUBJECT, timeout=timeout)
        if email_uid is None:
            print("Email not received within timeout!")
            return
        body = self.get_body(email_uid)
        links = self.get_nx_links_from_email(body)
        return links

    def get_nx_links_from_email(self, email_body):
        url = rf'href=[\'\"]?(https:\/\/([^<>]*)(|.dev|.test|\.mx\/|.host\/|\.com\/)(authorize)\/[^\'\" >]+)'
        res = re.findall(url, str(email_body))
        return str(res[0][0])

    def delete_email(self, email_uid):
        self.login()
        # Mark the email for deletion
        self.mailbox.uid('STORE', email_uid, '+FLAGS', '(\Deleted)')

        # Permanently remove mails that are marked for deletion
        self.mailbox.expunge()
        self.logout()

    @staticmethod
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

    def wait_for_email(self, recipient, subject, timeout=30):
        """
        This function waits for a new email to be received by the specified recipient.
        """

        self.login()
        start_time = time.time()
        try:
            while True:
                # Check if the timeout has been reached
                if time.time() - start_time > timeout:
                    return None
                # Search the inbox for emails with specific "To" header
                self.mailbox.NOOP()
                result, data = self.mailbox.uid('search', None, f'(HEADER "To" "{recipient}")', f'(SUBJECT "{subject}")')
                email_ids = data[0].split()

                for email_id in email_ids:
                    result, email_data = self.mailbox.uid('fetch', email_id, '(FLAGS)')
                    email_flags = email_data[0].decode()  # decode the entire byte string
                    if result == 'OK' and '\\Seen' not in email_flags:
                        self.mailbox.uid('store', email_id, '+FLAGS', '\\Seen')
                    return email_id
                time.sleep(5)
        finally:
            self.logout()

    def _get_links_from_email(self, body):
        res = re.findall(r'href=[\'"]?([^\'" >]+)', body)
        return res

    def find_links_in_email(self, body, expected_links):
        for expected_link in expected_links:
            for link in self._get_links_from_email(body):
                if expected_link in link:
                    break
            else:
                raise RuntimeError(f"Expected link not found in email: {expected_link}")

    def check_email_button(self, body, env, color):
        pat = '(<a class="btn" href="{})(.[^>]*)(background-color: {};)'.format(
            env, color)
        if not re.search(pat, body):
            raise Exception("Button background-color was not found.")

    def check_email_user_names(self, body, fName, lName):
        pat = '(<h1.*>).*({} {}.*</h1>)'.format(fName, lName)
        if not re.search(pat, body):
            raise Exception("User name was not in the email.")

    def check_email_cloud_name(self, body, cloudName):
        pat = '(<p).*({}).*(</p>)'.format(cloudName)
        if not re.search(pat, body):
            raise Exception("Cloud name was not in the email.")

    def check_for_blank_target(self, body, url):
        pat = '(<a class="btn" href="{})(.[^>]*)(target=_blank)'.format(url)
        if not re.search(pat, body):
            raise Exception("Button target was not 'blank'.")


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
        return ''.join(parts)

    def find_links_in_body(self, expected_links):
        email_links = re.findall(r'href=[\'"]?([^\'" >]+)', self.get_body())
        for expected_link in expected_links:
            for link in email_links:
                if expected_link in link:
                    break
            else:
                raise RuntimeError(f"Expected link not found in email: {expected_link}")

    def get_nx_links_from_email(self):
        url = rf'href=[\'\"]?(https:\/\/([^<>]*)(|.dev|.test|\.mx\/|.host\/|\.com\/)(authorize)\/[^\'\" >]+)'
        res = re.findall(url, self.get_body())
        return str(res[0][0])

    def get_button_color(self, href_value) -> str:
        href_value = re.escape(href_value)
        pattern = rf'<a class="btn" href="{href_value}[^>]+?background-color: (#[A-F0-9]+);'
        match = re.search(pattern, self.get_body())
        return match.group(1)

    def is_cloud_name_present(self, cloud_name) -> bool:
        cloud_name = re.escape(cloud_name)
        pattern = rf'<p.*?>[^<]*{cloud_name}[^<]*</p>'
        return re.search(pattern, self.get_body()) is not None


class EmailClient:

    def __init__(self, email=rb.BASE_EMAIL, password=rb.BASE_EMAIL_PASSWORD, email_alias=None):
        self._email = email
        self._password = password
        self._alias = email_alias
        self._mailbox = IMAP4_SSL('imap.gmail.com', 993)

    def wait_for_reset_password_email(self, timeout=60) -> EmailMessage:
        return self.wait_for_email_subject('Reset', timeout=timeout)

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
