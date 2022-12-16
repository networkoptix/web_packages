from CloudPortalAPI import CloudPortalAPI
from robot.libraries.BuiltIn import BuiltIn

class FeatureFlagListener:
    ROBOT_LISTENER_API_VERSION = 3
    def __init__(self):
        self.api_done = False
         
    def start_suite(self, data, result):
        if not self.api_done:
            featureAPI = CloudPortalAPI(env=BuiltIn().get_variable_value("${ENV}"))
            featureAPI.set_feature_flags()
            self.api_done = True