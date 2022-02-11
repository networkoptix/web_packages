"""'Creates images for 4.0 - 5.0 servers using the deb files from current folder'"""
import os
import subprocess

deb_files = {}
cloud_hosts = ('test', 'stage', 'dev2', 'prod', 'test_ci')
for _, _, files in os.walk("4.2/"):
    for file in files:
        if 'nxwitness-server-4.0' in file:
            deb_files.update({'4.0': file})
        elif 'nxwitness-server-4.1' in file:
            deb_files.update({'4.1': file})
        elif 'nxwitness-server-4.2' in file:
            deb_files.update({'4.2': file})

for key, val in deb_files.items():
    for cloud_host in cloud_hosts:
        subprocess.run(f'cd 4.2 && docker build -t {key}_{cloud_host} --build-arg mediaserver_deb={val} .', shell=True)

for root, dirs, files in os.walk("5.0/"):
    for file in files:
        if 'nxwitness-server-5.0' in file:
            subprocess.run(f'cd 5.0 && docker build -t 5.0 --build-arg mediaserver_deb={file} .', shell=True)
            break

