import os

from PIL import Image
from pyotp import *

try:
    from pyzbar.pyzbar import decode
except FileNotFoundError as e:
    if os.name == 'nt':
        raise FileNotFoundError(
            f"{e} "
            f"The problem could be caused by missing MSVCR120.dll "
            f"(Visual C++ Redistributable Packages for Visual Studio 2013). "
            f"See: https://www.microsoft.com/en-US/download/details.aspx?id=40784")
    else:
        raise


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
