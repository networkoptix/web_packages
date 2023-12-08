from django.test import TestCase

from partners.forms.grant_access_form import GrantAccessForm


class GrantAccessEmailFormTest(TestCase):
    def test_success_valid_email(self):
        form: GrantAccessForm = GrantAccessForm({'email': 'test@networkoptix.com'})
        self.assertTrue(form.is_valid())

    def test_success_invalid_email(self):
        form: GrantAccessForm = GrantAccessForm({'email': 'test@should-fail.com'})
        self.assertFalse(form.is_valid())
