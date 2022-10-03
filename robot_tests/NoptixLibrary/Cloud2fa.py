import pyqrcode

from pyotp import *
from PIL import Image
from pyzbar.pyzbar import decode

class Cloud2fa:
    def get_2fa_verification_code(self, key):
        totp = TOTP(key)
        token = totp.now()
        return token

    def decode_qr(self, qrName):
        data = decode(Image.open(qrName))
        dataString = str(data)
        dataString = dataString.split('secret=')
        dataString = dataString[1]
        key = dataString.split("'")[0]
        return key