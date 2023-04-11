from CloudPortalAPI import CloudPortalAPI
from robot.libraries.BuiltIn import BuiltIn
from GenericKeywords import GenericKeywords
import time


class FeatureFlagListener:
    ROBOT_LISTENER_API_VERSION = 3

    def start_suite(self, data, result):
        expected_settings = GenericKeywords().get_features_json("NoptixLibrary/features.json")
        cloud = CloudPortalAPI(env=BuiltIn().get_variable_value("${ENV}"))
        cloud.set_feature_flags(expected_settings)
        expected_settings_converted = {}
        for setting in expected_settings.keys():
            new_key = setting[0].lower() + setting[1:].replace(' ', '')
            expected_settings_converted[new_key] = expected_settings[setting]

        start_time = time.monotonic()
        while True:
            cloud_settings = cloud.get_cloud_settings()
            print(cloud_settings["featureFlags"])
            print("\n")
            print(expected_settings_converted)
            print("\n")
            if cloud_settings["featureFlags"] == expected_settings_converted:
                break
            if time.monotonic() - start_time > 30:
                raise TimeoutError("Feature flags did not update in time.")
            time.sleep(5)
