from conftest import BaseModelTest
from zapier.models import *
import pytest

class TestZapHook(BaseModelTest):
    model_class = ZapHook
    expected_meta = {
        'event': {
            'max_length': 1024
        }
    }

    def test_str(self, instance):
        name = str(instance)
        assert name == f'{instance.user} - {instance.event}'


class TestGeneratedRule(BaseModelTest):
    model_class = GeneratedRule
    expected_meta = {
        'caption': {
            'max_length': 1024
        },
        'source': {
            'max_length': 1024,
            'default': ''
        },
        'system_id': {
            'max_length': 1024
        },
        'email': {
            'max_length': 1024
        },
        'direction': {
            'max_length': 100
        },
        'times_used': {
            'default': 1
        }
    }
        
    def test_str(self, instance):
        name = str(instance)
        assert name == instance.caption
