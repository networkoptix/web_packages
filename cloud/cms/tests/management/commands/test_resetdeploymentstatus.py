import pytest

from cms.management.commands.resetdeploymentstatus import *


class TestResetDeploymentStatus:
    def test_handle(self):
        deployment_cache = caches['deployment']
        deployment_cache.set(
            DEPLOYMENT_READY, True)

        assert deployment_cache.get(DEPLOYMENT_READY)
        Command().handle()
        assert not deployment_cache.get(DEPLOYMENT_READY)
