from conans import ConanFile, tools
from conans.errors import ConanException
from pathlib import Path
import os
import shutil
import sys


class WebadminConan(ConanFile):
    license = None
    name = "webadmin"
    description = "Web-based settings for the Nx Witness Mediaserver"
    settings = None
    no_copy_source = True
    url = None

    def set_version(self):
        git = tools.Git()
        self.version = git.get_revision()

    def source(self):
        # Using default for local building fallback.
        gitlab_url = os.getenv("DEFAULT_GIT_URL") or 'git@gitlab.ru.nxteam.dev'
        # Cannot use the `scm` attribute because the version is set dynamically.
        git = tools.Git()
        git.clone(f"{gitlab_url}/dev/cloud_portal.git", self.version, shallow=True)

    def build(self):
        self.run(" ".join([
            sys.executable,
            str(Path(self.source_folder) / "get_zip_from_cloud.py"),
            "-i", "https://nxvms.com",
            os.getenv("CMS_PULLER_USERNAME"),
            os.getenv("CMS_PULLER_PASSWORD"),
            "type", "--type=vms",
            "--customization=default"
        ]))

        os.rename(Path("customization_pack-default") / "package.zip", "package.zip")

        env = {
            "NPM_CONFIG_CACHE": str(Path(self.build_folder) / ".npm"),
            "NG_CLI_ANALYTICS": "false",
        }

        with tools.environment_append(env):
            self.run(Path(self.source_folder) / "webadmin"/ "build.sh")

    def package(self):
        os.rename(
            Path(self.build_folder) / "webadmin.zip", Path(self.package_folder) / "webadmin.zip")
        shutil.copy(
            Path(self.source_folder) / "webadmin" / "apply_customization.py", self.package_folder)
