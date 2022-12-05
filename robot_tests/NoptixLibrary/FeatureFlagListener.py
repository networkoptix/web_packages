
from CloudPortalAPI import CloudPortalAPI

featureAPI = CloudPortalAPI()
class FeatureFlagListener:
    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self):
        featureAPI.set_feature_flags()