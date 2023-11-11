from conan import ConanFile
from conan.errors import ConanException
from conan.tools.env import Environment
from conan.tools.files import copy
from conan.tools.scm import Git
from pathlib import Path
import os
import shutil
import sys


class WebadminConan(ConanFile):
    name = "webadmin"
    description = "Web-based settings for the Nx Witness Mediaserver"
    settings = None
    no_copy_source = True

    def set_version(self):
        git = Git(self)
        self.version = git.get_commit()

    def source(self):
        gitlab_url = os.getenv("DEFAULT_GIT_URL") or 'git@gitlab.nxvms.dev'
        git = Git(self)
        git.fetch_commit(f"{gitlab_url}:dev/cloud_portal.git", commit=self.version)

    def generate(self):
        env = Environment()
        env.define("NPM_CONFIG_CACHE", str(Path(self.build_folder) / ".npm"))
        env.define("NG_CLI_ANALYTICS", "false")
        env.vars(self).save_script("buildenv")

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

        self.run(Path(self.source_folder) / "webadmin"/ "build.sh")

    def package(self):
        copy(self, "webadmin.zip", self.build_folder, self.package_folder)
        copy(self, "apply_customization.py", f"{self.source_folder}/webadmin", self.package_folder)
