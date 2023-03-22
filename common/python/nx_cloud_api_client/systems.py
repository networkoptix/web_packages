from base_api import _BaseAPI


class System:
    def __init__(self, base_api: _BaseAPI):
        self.base_api = base_api

    def get_systems(self):
        url = 'https://www.yahoo.com'
        return self.base_api.get(url)
