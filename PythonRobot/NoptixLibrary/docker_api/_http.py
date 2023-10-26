import email.policy
import io
import logging
import socket
from abc import ABC
from abc import abstractmethod
from contextlib import contextmanager
from email.message import Message
from email.parser import FeedParser
from http import HTTPStatus
from http.client import BadStatusLine
from typing import ContextManager
from typing import Iterator


_logger = logging.getLogger(__name__.split('.')[-1])


class _HTTPRequest:

    def __init__(self, method: str, path: str, body: bytes):
        self._method = method
        self._path = path
        self._headers = Message()
        self._headers.add_header('User-Agent', 'CloudPortalHTTPClient')
        self._body = body

    @abstractmethod
    def __repr__(self):
        pass

    def add_header(self, key: str, value: str):
        self._headers.add_header(key, value)

    def set_header(self, key: str, value: str):
        try:
            self._headers.replace_header(key, value)
        except KeyError:
            self._headers.add_header(key, value)

    def send(self, stream: io.BufferedRWPair, http_version: str):
        raw_request = bytearray()
        raw_request.extend(f'{self._method} {self._path} {http_version}\r\n'.encode('ascii'))
        raw_request.extend(self._headers.as_bytes(policy=email.policy.HTTP))
        stream.write(raw_request)
        if self._body:
            stream.write(self._body)
        stream.flush()


class _GET(_HTTPRequest):

    def __init__(self, path: str, body: bytes):
        super().__init__("GET", path, body)
        if body:
            self._headers.add_header('Content-Length', str(len(body)))

    def __repr__(self):
        return f'<GET: {self._path}\n{self._headers}>'


class _POST(_HTTPRequest):

    def __init__(self, path: str, body: bytes):
        super().__init__("POST", path, body)
        if body:
            self._headers.add_header('Content-Length', str(len(body)))

    def __repr__(self):
        return f'<POST: {self._path}\n{self._headers}{self._body} (length={len(self._body)})>'


class _DELETE(_HTTPRequest):

    def __init__(self, path: str, body: bytes):
        super().__init__("DELETE", path, body)
        if body:
            self._headers.add_header('Content-Length', str(len(body)))

    def __repr__(self):
        return f'<DELETE: {self._path}\n{self._headers}>'


class _HTTPStream:

    _http_version = 'HTTP/1.1'

    def __init__(self, stream: io.BufferedRWPair, host: str):
        self._host = host
        self._stream = stream

    def get_response(self, request: '_HTTPRequest') -> '_HTTPResponse':
        self._send_request(request)
        response = self._read_response()
        _logger.debug("Received: %s", response)
        return response

    def _send_request(self, request: '_HTTPRequest'):
        request.set_header('Host', self._host)
        request.send(self._stream, self._http_version)
        _logger.debug("Sent %s", request)

    def _read_response(self) -> '_HTTPResponse':
        response = _HTTPResponse.read(self._stream)
        if response.status.protocol in ('HTTP/1.0', 'HTTP/1.1'):
            return response
        raise RuntimeError(f"Unsupported HTTP protocol: {response.status.protocol}")

    def get_whole_body(self, response: '_HTTPResponse') -> bytes:
        if response.status.code == HTTPStatus.NO_CONTENT:
            return b''
        result = bytearray()
        for chunk in response.get_body(self._stream):
            result.extend(chunk)
        return bytes(result)

    def iter_body(self, response: '_HTTPResponse') -> Iterator[bytes]:
        if response.status.code == HTTPStatus.NO_CONTENT:
            return
        yield from response.get_body(self._stream)


class _HTTPStatus:

    def __init__(self, protocol: str, code: int, reason: str):
        self.protocol = protocol
        self.code = code
        self.reason = reason

    @classmethod
    def read(cls, reader: io.BufferedRWPair):
        status_line = reader.readline().decode()
        try:
            protocol, code, reason = status_line.strip().split(maxsplit=2)
        except ValueError:
            raise BadStatusLine(status_line)
        return cls(protocol, int(code), reason)


class _ResponseBody(Iterator[bytes], ABC):

    # There are multiple options to transfer a bytes stream via HTTP protocol
    # See: https://datatracker.ietf.org/doc/html/rfc2616#section-14.13
    # See: https://datatracker.ietf.org/doc/html/rfc9112

    def __init__(self, stream: io.BufferedRWPair):
        self._stream = stream


class _ChunkedBody(_ResponseBody):

    def _read_chunk_size(self):
        chunk_size_bytes = self._stream.readline()
        return int(chunk_size_bytes.rstrip(), base=16)

    def _assert_end_flag(self):
        if end_flag := self._stream.read(2) != b'\r\n':
            raise RuntimeError(f"Bad chunk end flag {end_flag} instead of \\r\\n")

    def __next__(self) -> bytes:
        chunk_size = self._read_chunk_size()
        chunk = self._stream.read(chunk_size)
        self._assert_end_flag()
        if chunk_size == 0:
            raise StopIteration()
        return chunk


class _Content(_ResponseBody):

    _chunk_size_bytes = 2 * 1024 * 1024

    def __init__(self, stream: io.BufferedRWPair, content_length: int):
        super().__init__(stream)
        self._bytes_left_to_read = content_length

    def __next__(self):
        if self._bytes_left_to_read == 0:
            raise StopIteration()
        bytes_to_read = min(self._bytes_left_to_read, self._chunk_size_bytes)
        chunk = self._stream.read(bytes_to_read)
        self._bytes_left_to_read -= bytes_to_read
        return chunk


class _HTTPResponse:

    def __init__(self, status: '_HTTPStatus', headers: Message):
        self.status = status
        self.headers = headers

    @classmethod
    def read(cls, stream: io.BufferedRWPair):
        status = _HTTPStatus.read(stream)
        headers = _read_headers(stream)
        return cls(status, headers)

    def get_body(self, stream: io.BufferedRWPair) -> '_ResponseBody':
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            return _Content(stream, content_length)
        transfer_encoding = self.headers.get('Transfer-Encoding', '')
        if transfer_encoding == 'chunked':
            return _ChunkedBody(stream)
        raise RuntimeError(f"{self} is not followed by any known bytes stream implementation")

    def __repr__(self):
        return f'<{self.status.protocol} {self.status.code} {self.status.reason}>'


def _read_headers(stream: io.BufferedRWPair) -> Message:
    parser = FeedParser()
    while True:
        header_line = stream.readline()
        if header_line == b'\r\n':
            break
        parser.feed(header_line.decode('ascii', errors='surrogateescape'))
    return parser.close()


@contextmanager
def _http_stream(host: str, port: int) -> ContextManager[_HTTPStream]:
    with socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM) as sock:
        sock.connect((host, port))
        with sock.makefile('rwb') as stream:
            yield _HTTPStream(stream, f"{host}:{port}")
