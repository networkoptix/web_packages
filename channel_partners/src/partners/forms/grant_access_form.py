from django import forms
from django.core.validators import RegexValidator


class GrantAccessForm(forms.Form):
    email = forms.EmailField(
        label='Your email',
        validators=[RegexValidator(
            regex=r'.*@networkoptix.com$',
            message="Must be a '@networkoptix.com' address")]
    )
