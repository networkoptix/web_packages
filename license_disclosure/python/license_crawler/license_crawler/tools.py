import json
import os.path
import sys
import time
import traceback
from functools import cached_property
from typing import List, Optional, Generator, Tuple

import requests
import pytoml as toml
import jk_pypiorgapi
from licensecheck.packageinfo import getPackages
from licensecheck.types import PackageInfo, ucstr

from lic_allowed import allowed_license, NORMALIZED_LICENSES, LICENCES_FULL_NAMES
from lic_exceptions import EXCEPTIONS

AVAILABLE_GROUPS = [
    'prod',
]

ARTIFACTORY_URL = 'https://artifactory.hdw.mx/artifactory/api/pypi/pypi/simple'

api = jk_pypiorgapi.PyPiOrgAPI()

KNOWN_LICENSE_FILES = [
    "COPYING",
    "COPYING.md",
    "COPYING.markdown",
    "COPYING.txt",
    "LICENCE",
    "LICENCE.md",
    "LICENCE.markdown",
    "LICENCE.txt",
    "LICENSE",
    "LICENSE.md",
    "LICENSE.markdown",
    "LICENSE.txt",
    "LICENSE-2.0.txt",
    "LICENCE-2.0.txt",
    "LICENSE-APACHE",
    "LICENCE-APACHE",
    "LICENSE-APACHE-2.0.txt",
    "LICENCE-APACHE-2.0.txt",
    "LICENSE-MIT",
    "LICENCE-MIT",
    "LICENSE.MIT",
    "LICENCE.MIT",
    "LICENSE.code",
    "LICENCE.code",
    "LICENSE.docs",
    "LICENCE.docs",
    "LICENSE.rst",
    "LICENCE.rst",
    "MIT-LICENSE",
    "MIT-LICENCE",
    "MIT-LICENSE.md",
    "MIT-LICENCE.md",
    "MIT-LICENSE.markdown",
    "MIT-LICENCE.markdown",
    "MIT-LICENSE.txt",
    "MIT-LICENCE.txt",
    "MIT_LICENSE",
    "MIT_LICENCE",
]


MAIN_BRANCHES = [
    'master',
    'main',
]


def github_licenses_urls(base_url: str) -> Generator[Tuple[str, str], None, None]:
    for file_name in KNOWN_LICENSE_FILES:
        for branch in MAIN_BRANCHES:
            if base_url.endswith('/'):
                base_url = base_url[:-1]
            raw_url = base_url.replace('github.com', 'raw.githubusercontent.com').replace('http://', 'https://')
            yield f'{base_url}/blob/{branch}/{file_name}', f'{raw_url}/{branch}/{file_name}'


def sourceforge_licenses_urls(base_url: str) -> Generator[Tuple[str, str], None, None]:
    if base_url.endswith('/'):
        base_url = base_url[:-1]
    if 'ci/default/tree' not in base_url:
        base_url = f'{base_url}/code/ci/default/tree'
    for file_name in KNOWN_LICENSE_FILES:
        yield f'{base_url}/{file_name}', f'{base_url}/{file_name}'


class Package:
    def __init__(self, name: str):
        self.name: str = name
        self.pkg_info: Optional[dict] = self.get_info()
        _license: Optional[str] = self.pkg_info.get('license') if self.pkg_info else None
        if not _license or len(_license) > 100:
            # get license from exceptions if it's not in the package info or it's too long
            if self.pkg_info_alternate:
                _license = self.pkg_info_alternate.license
            if not _license:
                print(f'Could not get license for {self.name}, using exception')
                _license = EXCEPTIONS.get(self.name, {}).get('license')
        self.license: str = _license
        self.source_url: Optional[str] = self.get_source_url()
        self.homepage_url: Optional[str] = self.get_homepage_url()
        license_url, self.license_raw_url = self.check_license_file()
        self.license_url = license_url or EXCEPTIONS.get(self.name, {}).get('license_url')

    def __str__(self):
        return self.name

    def print(self):
        print('--------------------------------')
        print('Name:', self.name)
        print('License:', self.get_licences())
        print('Homepage:', self.homepage_url)
        print('Source:', self.source_url)
        print('License URL:', self.get_licenses_urls())
        print('License Raw URL:', self.license_raw_url)
        print('--------------------------------')


    def as_dict(self) -> dict:
        return {
            'name': self.name,
            'licenses': self.normalized_licenses(),
            'url': self.homepage_url or self.source_url,
            'licenseFiles': self.get_licenses_urls(),
        }


    @property
    def project_urls(self) -> Optional[dict]:
        return self.pkg_info.get('project_urls') if self.pkg_info else None

    @property
    def project_url(self) -> Optional[str]:
        return self.pkg_info.get('project_url') if self.pkg_info else None

    @property
    def is_license_allowed(self) -> bool:
        if not self.license:
            return False
        return any([lic.lower() in allowed_license for lic in self.license.split('/')])

    def get_info(self) -> Optional[dict]:
        try:
            package_info = api.getPackageInfoJSON(self.name)
            if package_info:
                return package_info.get('info')
        except Exception as e:
            return None

    @cached_property
    def pkg_info_alternate(self) -> Optional[PackageInfo]:
        info_set = getPackages({ucstr(self.name)})
        if info_set:
            return info_set.pop()
        return None

    def get_license(self) -> Optional[str]:
        _license: Optional[str] = self.pkg_info.get('license') if self.pkg_info else None
        if not _license or len(_license) > 100:
            # get license from exceptions if it's not in the package info or it's too long
            if self.pkg_info_alternate:
                _license = self.pkg_info_alternate.license
            if not _license:
                _license = EXCEPTIONS.get(self.name, {}).get('license')
        return _license

    def get_source_url(self) -> Optional[str]:
        if self.project_urls:
            for url_name, url in self.project_urls.items():
                url_name = url_name.lower()
                if 'source' in url_name or 'code' in url_name or 'repository' in url_name:
                    return url
        return None

    def get_homepage_url(self) -> Optional[str]:
        if self.project_urls:
            any_page = None
            for url_name, url in self.project_urls.items():
                if not url:
                    continue
                url_name = url_name.lower()
                if not any_page:
                    any_page = url
                if 'home' in url_name:
                    return url
            return any_page
        alternate_url = self.pkg_info_alternate.homePage
        if alternate_url and alternate_url != 'UNKNOWN':
            return alternate_url



    def check_license_file(self) -> Tuple[Optional[str], Optional[str]]:
        for url in [self.source_url, self.homepage_url]:
            if not url:
                continue
            if 'github.com' in url:
                url_gen = github_licenses_urls
            elif 'sourceforge.net' in url:
                url_gen = sourceforge_licenses_urls
            else:
                continue
            for license_url, raw_url in url_gen(url):
                try:
                    response = requests.head(raw_url)
                    if response.status_code == 200:
                        return license_url, raw_url
                except Exception as e:
                    pass
        return None, None

    def get_licenses_urls(self) -> List[str]:
        if not self.license_url:
            return []
        if isinstance(self.license_url, str):
            return [self.license_url]
        if isinstance(self.license_url, list):
            return self.license_url
        return []

    def get_licences(self) -> List[str]:
        if not self.license:
            return []
        licenses = self.license.replace('/', ';; ').split(';; ')
        return [lic.lower() for lic in licenses]

    def normalized_licenses(self) -> List[str]:
        licences = []
        for lic in self.get_licences():
            if normalized := NORMALIZED_LICENSES.get(lic):
                licences.append(normalized)
        return licences


class InfoCrawler:
    def __init__(self, project_path: str, output_file: Optional[str] = None):
        self.project_path: str = project_path
        self.packages: List[str] = self.get_packages_list(self.project_path)
        self.existing_licenses_info: List[dict] = self.get_existing_licenses_info(self.project_path)
        self.packages_without_licenses: List[str] = self.get_packages_names_without_licenses()
        self.extra_licenses_names: List[str] = self.get_extra_packages()
        self.output_file: Optional[str] = output_file

    @property
    def is_valid(self) -> bool:
        return not self.packages_without_licenses and not self.extra_licenses_names and not self.not_allowed_licenses
    
    @cached_property
    def missing_packages_info(self) -> List[Package]:
        return self.get_packages_info(self.packages_without_licenses)
    
    @cached_property
    def existing_licenses_names(self) -> List[str]:
        return [dep['name'] for dep in self.existing_licenses_info]

    @staticmethod
    def get_packages_list(project_path: str) -> List[str]:
        with open(project_path + '/pyproject.toml') as f:
            data = toml.load(f)
        root_dependencies = data['tool']['poetry']['dependencies']
        dep_list = []
        if len(root_dependencies) > 1:
            dep_list = list(root_dependencies.keys())
        else:
            for group in AVAILABLE_GROUPS:
                group_dependencies = data['tool']['poetry']['group'].get(group, {}).get('dependencies', {})
                if len(group_dependencies) > 0:
                    dep_list = list(group_dependencies.keys())
        return [d for d in dep_list if d != 'python']

    @staticmethod
    def get_existing_licenses_info(project_path: str) -> List[dict]:
        licenses_path = project_path + '/dependencies-licenses.json'
        if os.path.exists(licenses_path):
            with open(licenses_path) as f:
                licenses_json = json.load(f)
            return licenses_json or []
        return []

    def get_packages_names_without_licenses(self) -> List[str]:
        return sorted([dep for dep in self.packages if dep not in self.existing_licenses_names])

    def get_extra_packages(self) -> List[str]:
        return sorted([dep for dep in self.existing_licenses_names if dep not in self.packages])

    @staticmethod
    def get_packages_info(packages_names: List[str]) -> List[Package]:
        return [Package(dep) for dep in packages_names]

    @cached_property
    def not_allowed_licenses(self) -> List[dict]:
        not_allowed = []
        for pkg in self.existing_licenses_info:
            pkg_licenses = pkg['licenses']
            if not any([lic in LICENCES_FULL_NAMES for lic in pkg_licenses]):
                not_allowed.append(pkg)
        return not_allowed

    def deps_with_lic(self):
        if self.not_allowed_licenses:
            print('Some packages have not allowed licenses:')
            print(json.dumps(self.not_allowed_licenses, indent=4))
            sys.exit(1)
        lic_list = [dep.as_dict() for dep in self.missing_packages_info]
        return sorted(lic_list, key=lambda x: x['name'])

    def json(self) -> None:

        lic_list = self.deps_with_lic()
        if self.output_file:
            with open(self.output_file, 'w') as f:
                json.dump(lic_list, f, indent=4)
        else:
            print(json.dumps(lic_list, indent=4))

    def print_extra_licenses(self):
        print('The following packages are not in the dependencies anymore, '
              'please remove them from dependencies-licenses.json file:')
        print('Extra licenses:')
        for lic in self.extra_licenses_names:
            print(f'\t{lic}')
            
    def print_missing_licenses(self):
        print('The following packages are missing from dependencies-licenses.json file:')
        for pkg in self.packages_without_licenses:
            print(f'\t{pkg}')
        

    def print_fetched_licenses(self):
        try:
            lic_list = [dep.as_dict() for dep in self.missing_packages_info]
            print('I have grabbed some information for you:')
            print(json.dumps(lic_list, indent=4))
            print('')
        except Exception as e:
            print("Sorry, I couldn't fetch the licenses for you because of following error.")
            traceback.print_exc()

    def print_allowed_licenses(self):
        print('Please check that package licenses are allowed and add them to dependencies-licenses.json file.')
        print('Allowed licenses:')
        for lic in LICENCES_FULL_NAMES:
            print(f'\t{lic}')

    def print_not_allowed_licenses(self):
        print('Some packages have not allowed licenses:')
        print(json.dumps(self.not_allowed_licenses, indent=4))

    def print_errors(self):
        if self.extra_licenses_names:
            self.print_extra_licenses()
        if self.packages_without_licenses:
            self.print_missing_licenses()
            self.print_fetched_licenses()
        if self.not_allowed_licenses:
            self.print_not_allowed_licenses()
        self.print_allowed_licenses()
        if not self.is_valid:
            sys.exit(1)
            