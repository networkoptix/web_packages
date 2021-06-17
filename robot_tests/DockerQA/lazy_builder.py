"""'Creates images for 4.0 - 4.3 servers using the deb files from current folder'"""
import os
import subprocess

deb_files = {}

for root, dirs, files in os.walk("."):
    for file in files:
        if 'nxwitness-server-4.0' in file:
            deb_files.update({'4.0': file})
        elif 'nxwitness-server-4.1' in file:
            deb_files.update({'4.1': file})
        elif 'nxwitness-server-4.2' in file:
            deb_files.update({'4.2': file})
        elif 'nxwitness-server-4.3' in file:
            deb_files.update({'4.3': file})

for key, val in deb_files.items():
    subprocess.run(f'docker build -t {key}_test --build-arg mediaserver_deb={val} .', shell=True)
