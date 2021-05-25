from conans import ConanFile, tools
from conans.errors import ConanException
from pathlib import Path
import os
import sys


class WebadminConan(ConanFile):
    name = "webadmin"
    description = "Web-based settings for the Nx Witness Mediaserver"
    settings = None
    no_copy_source = True

    def set_version(self):
        git = tools.Git()
        self.version = git.get_revision()

    def source(self):
        # Cannot use the `scm` attribute because the version is set dynamically.
        git = tools.Git()
        git.clone("git@gitlab.lan.hdw.mx:dev/cloud_portal.git", self.version, shallow=True)

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
            Path(self.build_folder) / "external.dat", Path(self.package_folder) / "external.dat")
