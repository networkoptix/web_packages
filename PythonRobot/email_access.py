import quopri
from imaplib import IMAP4_SSL
import email
from re import findall
from RobotVariables import RobotVariables
import time
from random import randint

rb = RobotVariables("en_US")


class Email:

    def __init__(self, user_email=rb.BASE_EMAIL, email_alias=None):
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
                    self.email_body = quopri.decodestring(msg_data[0][1])
                    self.logout()
                    return True
        self.logout()  
        return False
    
    def get_body(self, email_id):
        self.login()  
        email_id_str = email_id.decode('utf-8')
        status, msg_data = self.mailbox.uid('fetch', email_id_str, "(RFC822)")
        if status == "OK":
            self.email_body = quopri.decodestring(msg_data[0][1])
            self.logout()  
            return self.email_body
        self.logout()  
        return False

    def get_email_link(self, recipient, link_type, timeout=10):
        email_uid = self.wait_for_email(recipient, timeout, status="UNREAD")
        if email_uid is None:
            print("Email not received within timeout!")
            return
        if link_type=='activate':
            self.check_email_subject(email_uid, rb.ACTIVATE_YOUR_ACCOUNT_EMAIL_SUBJECT)
        body = self.get_body(email_uid)
        links = self.get_nx_links_from_email(body)
        return links

    def get_nx_links_from_email(self, email_body):
        url = rf'href=[\'\"]?(https:\/\/([^<>]*)(|.dev|.test|\.mx\/|.host\/|\.com\/)(authorize)\/[^\'\" >]+)'
        res = findall(url, str(email_body))
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
    
    def wait_for_email(self, recipient, timeout=30, status='UNSEEN'):
        self.login()
        start_time = time.time()
        try:
            while True:
                # Check if the timeout has been reached
                if time.time() - start_time > timeout:
                    return None

                # Search the inbox for emails with specific "To" header
                result, data = self.mailbox.uid('search', None, f'(HEADER "To" "{recipient}")')
                email_ids = data[0].split()
                
                for email_id in email_ids:
                    result, email_data = self.mailbox.uid('fetch', email_id, '(FLAGS)')
                    email_flags = email_data[0].decode()  # decode the entire byte string
                    if result == 'OK' and '\\Seen' not in email_flags:
                        result, email_data = self.mailbox.uid('fetch', email_id, '(BODY.PEEK[HEADER])')
                        raw_email = email_data[0][1].decode('utf-8')
                        email_message = email.message_from_string(raw_email)
                        return email_id
                time.sleep(1)
        finally:
            self.logout()
