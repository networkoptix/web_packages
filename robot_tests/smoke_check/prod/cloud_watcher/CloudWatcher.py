import time
import subprocess
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ssl_port = 465
sender_email = 'cloudsmokecheck@gmail.com'
receiver_email = 'kamilb@networkoptix.com'
password = 'QWEasd!@#'


class CloudWatcher:
    def __init__(self):
        try:
            context = ssl.create_default_context()
            self.smtp_server = smtplib.SMTP_SSL("smtp.gmail.com", ssl_port, context=context)
            self.smtp_server.login(sender_email, password)
        except Exception as e:
            print(e)

    def send_email(self, errors):
        message = MIMEMultipart("alternative")
        message["Subject"] = "Cloud Watcher ALARM"
        message["From"] = sender_email
        message["To"] = receiver_email
        text = ''
        error_list = ''
        for err in errors:
            text += f'{err}\n'
            error_list += f'<li>{err}</li>'
        html = f"""\
        <html>
          <body>
            <p>
               Following errors occurred during cloud monitoring:<br>
               {error_list}
               Check <a href="https://status.nxvms.com">status.nxvms.com</a><br> 
               Run full smoke check in <a href="http://10.1.5.133:8080">Jenkins</a>
            </p>
          </body>
        </html>
        """

        message.attach(MIMEText(text, "plain"))
        message.attach(MIMEText(html, "html"))

        self.smtp_server.sendmail(sender_email, receiver_email, message.as_string())

    def run(self):
        cmd = 'robot -d smoke_check/prod/cloud_watcher/res smoke_check/prod/cloud_watcher/check_status.robot'
        while True:
            subprocess.run(cmd, shell=True)
            time.sleep(60)


if __name__ == '__main__':
    cw = CloudWatcher()
    cw.run()
