from CloudPortalAPI import CloudPortalAPI
from robot.libraries.BuiltIn import BuiltIn
import time


class FeatureFlagListener:
    ROBOT_LISTENER_API_VERSION = 3
         
    def start_suite(self, data, result):
        cloud = CloudPortalAPI(env=BuiltIn().get_variable_value("${ENV}"))
        expected_settings = cloud.set_feature_flags()
        expected_settings_converted = {}
        for setting in expected_settings.keys():
            new_key = setting[0].lower() + setting[1:].replace(' ', '')
            expected_settings_converted[new_key] = expected_settings[setting]

        start_time = time.monotonic()
        while True:
            cloud_settings = cloud.get_cloud_settings()
            if cloud_settings["featureFlags"] == expected_settings_converted:
                break
            if time.monotonic() - start_time > 120:
                raise TimeoutError("Feature flags did not update in time.")
            time.sleep(5)
