import pytest
from nx_ireg.registry import IReg


class TestIreg:
    def test_init(self):
        ireg = IReg("test")
        assert len(ireg._customizations) > 0
        assert ireg.get_default_host() == "cloud-test.hdw.mx"
        assert len(ireg.get_other_customizations()) == len(ireg._customizations) - 1
        assert "default" not in dict(ireg.get_other_customizations())

    def test_get_customization_by_host(self):
        ireg = IReg("test")
        assert ireg.get_customization_by_host("cloud-test.hdw.mx") == "default"
        assert ireg.get_customization_by_host("metavms.cloud-test.hdw.mx") == "metavms"
        assert ireg.get_host_by_customization("metavms") == "metavms.cloud-test.hdw.mx"
        customization, hostname = ireg._customizations.pop()
        assert ireg.get_host_by_customization(customization) is None
