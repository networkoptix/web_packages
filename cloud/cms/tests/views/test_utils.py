import pytest
from rest_framework import status

from cms.views.utils import *


def test_sanitize_html(arf, temp_superuser):
    html = '''
    <p><span style="font-weight: bold">bold text</span></p>
    <ul><li style="font-weight: 400; text-decoration: none;">list item<li></ul>
    <p><span style="font-weight: normal">regular text</span></p>
    '''

    req = arf.post('/api/sanitize_html', data={'html': html})
    req.user = temp_superuser
    resp = sanitize_html(req)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data == {
        'sanitizedHTML': '<p><strong>bold text</strong></p> <ul><li>list item</li></ul> <p>regular text</p>'
    }
