import base64
import hashlib
import hmac
import io
import os
import struct
import time
from datetime import datetime
from typing import Optional
from typing import Union
from urllib.parse import parse_qsl
from urllib.parse import urlparse


from PIL import Image

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


class TimeBasedOtp:
    DIGITS = 6

    def __init__(self, secret_key: str) -> None:
        self._secret = base64.b32decode(secret_key, True)

    def generate_otp(self, at_time: Optional[Union[float, datetime]] = None):
        if at_time is None:
            at_time = time.time()
        elif isinstance(at_time, datetime):
            at_time = time.mktime(at_time.timetuple())
        current_time = int(at_time) // 30
        hashsum = hmac.new(self._secret, struct.pack('>Q', current_time), hashlib.sha1).digest()
        offset = hashsum[-1] & 0x0F
        code = struct.unpack('>I', hashsum[offset:offset + 4])[0] & 0x7FFFFFFF
        return str(code).zfill(self.DIGITS)[-self.DIGITS:]

    @classmethod
    def from_qr(cls, image_data: bytes):
        image = Image.open(io.BytesIO(image_data))
        [decoded_qr] = decode(image)
        first_str = decoded_qr.data.decode()
        parsed_otpauth = urlparse(first_str)
        query_params = dict(parse_qsl(parsed_otpauth.query))
        assert parsed_otpauth.scheme == 'otpauth'
        assert 'secret' in query_params
        return cls(query_params['secret'])
