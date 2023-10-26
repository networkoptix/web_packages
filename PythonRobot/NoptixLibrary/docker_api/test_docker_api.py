import logging
import unittest

from . import _Container
from . import ContainerConfiguration
from . import ContainerExists
from . import ContainerNotFound
from . import DockerHTTPApi
from . import get_ports_mapping


class TestContainer(unittest.TestCase):

    def setUp(self):
        self._docker_api = DockerHTTPApi("http://127.0.0.1:2375")
        self._configuration = ContainerConfiguration("registry", "2.0")
        self._container_name = "test_registry"
        _Container(self._docker_api, self._container_name).delete()

    def tearDown(self):
        _Container(self._docker_api, self._container_name).delete()

    def test_create(self):
        container = self._configuration.create(self._docker_api, self._container_name)
        self.assertEqual(container.inspect()["State"]["Status"], "created")

    def test_start(self):
        container = self._configuration.create(self._docker_api, self._container_name)
        container.start()
        self.assertTrue(container.inspect()["State"]["Running"])

    def test_stop(self):
        container = self._configuration.create(self._docker_api, self._container_name)
        container.start()
        self.assertTrue(container.inspect()["State"]["Running"])
        container.stop()
        self.assertFalse(container.inspect()["State"]["Running"])

    def test_duplicate(self):
        container = self._configuration.create(self._docker_api, self._container_name)
        container_id = container.inspect()["Id"]
        try:
            self._configuration.create(self._docker_api, self._container_name)
        except ContainerExists as err:
            existing_container_id = err.container.inspect()["Id"]
            self.assertEqual(container_id, existing_container_id)

    def test_add_env(self):
        configuration = self._configuration\
            .with_env({"VARIABLE1": "VALUE1", "VARIABLE2": "VALUE2"})
        container = configuration.create(self._docker_api, self._container_name)
        container.start()
        inspect_result = container.inspect()
        env = list(inspect_result["Config"]["Env"])
        self.assertIn("VARIABLE1=VALUE1", env)
        self.assertIn("VARIABLE2=VALUE2", env)

    def test_exposed_ports(self):
        tcp_port = 5000
        udp_port = 6000
        configuration = self._configuration\
            .with_exposed(tcp_ports=[tcp_port], udp_ports=[udp_port])
        container = configuration.create(self._docker_api, self._container_name)
        container.start()
        port_mappings = get_ports_mapping(container)
        tcp_mapping_found = udp_mapping_found = False
        for port_mapping in port_mappings:
            if port_mapping.protocol == 'tcp' and port_mapping.inner_port == tcp_port:
                tcp_mapping_found = True
            if port_mapping.protocol == 'udp' and port_mapping.inner_port == udp_port:
                udp_mapping_found = True
        if not tcp_mapping_found:
            raise RuntimeError(f"Can't find TCP port mapping for {tcp_port}")
        if not udp_mapping_found:
            raise RuntimeError(f"Can't find UDP port mapping for {udp_port}")

    def test_delete(self):
        container = self._configuration.create(self._docker_api, self._container_name)
        self.assertEqual(container.inspect()["State"]["Status"], "created")
        container.delete()
        with self.assertRaises(ContainerNotFound):
            container.inspect()
        with self.assertRaises(ContainerNotFound):
            container.stop()
        with self.assertRaises(ContainerNotFound):
            container.start()
        container.delete()  # Idempotency check


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s.%(msecs)03d %(levelname)7s %(name)s  %(message).5000s",
        )
    unittest.main()
