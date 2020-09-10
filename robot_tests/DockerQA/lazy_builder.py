"""'Creates images for 4.0, 4.1 and 4.2 servers for all cloud hosts using the deb files from current folder'"""
import os
import subprocess

vms_4_0 = vms_4_1 = vms_4_2 = None

for root, dirs, files in os.walk("."):
    for file in files:
        if 'nxwitness-server-4.0' in file:
            vms_4_0 = file
        elif 'nxwitness-server-4.1' in file:
            vms_4_1 = file
        elif 'nxwitness-server-4.2' in file:
            vms_4_2 = file

cloud_hosts = {
    'prod': 'nxvms.com',
    'test': 'cloud-test.hdw.mx',
    'stage': 'stage.nxvms.com',
    'dev2': 'dev2.cloud.hdw.mx'
}

for key, val in cloud_hosts.items():
    if vms_4_0:
        subprocess.run(f'docker build -t 4.0_{key} --build-arg mediaserver_deb={vms_4_0} --build-arg cloud_host={val} .', shell=True)
    if vms_4_1:
        subprocess.run(f'docker build -t 4.1_{key} --build-arg mediaserver_deb={vms_4_1} --build-arg cloud_host={val} .', shell=True)
    if vms_4_2:
        subprocess.run(f'docker build -t 4.2_{key} --build-arg mediaserver_deb={vms_4_2} --build-arg cloud_host={val} .', shell=True)

