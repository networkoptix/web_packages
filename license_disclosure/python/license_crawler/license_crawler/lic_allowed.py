ALLOWED_LICENSES = [
    'MIT License',
    'BSD License',
    'GNU General Public License v3 (GPLv3)',
    'GNU General Public License v2 (GPLv2)',
    'GNU GPL 3',
    'Python Software Foundation License',
    'GNU General Public License (GPL)',
    'Apache 2.0',
    'Apache 2',
    'Apache Software License',
    'Apache License 2.0',
    'GNU Lesser General Public License v3 or later (LGPLv3+)',
    'GNU Lesser General Public License v3 (LGPLv3)',
    'MPL2',
    'Historical Permission Notice and Disclaimer (HPND)',
    'HPND',
    'BSD',
    'MIT',
    'Public Domain',
    'GNU Library or Lesser General Public License (LGPL)',
    'Mozilla Public License 2.0 (MPL 2.0)',
    'LGPLv3+',
    'LGPL-3.0',
    'LGPL/MIT',
    'BSD-3-Clause',
    'ISC License',
    'Apache-2.0',
    'GPLv3',
]


allowed_license = [lic.lower() for lic in ALLOWED_LICENSES]


NORMALIZED_LICENSES = {
    'apache 2.0': 'Apache License 2.0',
    'apache 2': 'Apache License 2.0',
    'apache license 2.0': 'Apache License 2.0',
    'apache-2.0': 'Apache License 2.0',
    'bsd': 'BSD License',
    'bsd license': 'BSD License',
    'bsd-3-clause': 'BSD 3-Clause License',
    'gnu gpl 3': 'GNU General Public License v3 (GPLv3)',
    'gnu general public license v2 (gplv2)': 'GNU General Public License v2 (GPLv2)',
    'gplv3': 'GNU General Public License v3 (GPLv3)',
    'hpnd': 'Historical Permission Notice and Disclaimer License (HPDN)',
    'isc license': 'ISC License',
    'lgpl': 'GNU Lesser General Public License (LGPL)',
    'lgpl-3.0': 'GNU Lesser General Public License v3.0 (LGPLv3)',
    'gnu lesser general public license v3 (lgplv3)': 'GNU Lesser General Public License v3 (LGPLv3)',
    'mit': 'MIT License',
    'mit license': 'MIT License',
}

LICENCES_FULL_NAMES = {v for _, v in NORMALIZED_LICENSES.items()}
