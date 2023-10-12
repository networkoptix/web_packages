from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options


class ChromeBrowser(Chrome):

    def __init__(self):
        self._options = Options()
        self._configure()
        super().__init__(options=self._options)

    def _configure(self):
        self._options.add_argument("--enable-logging")
        self._options.add_argument("--log-level=3")

