#!/usr/bin/env python
# -*- coding: utf-8 -*-
import codecs
import email.header
import imaplib
import json
import logging
import os
import re
import socket
import subprocess
import time
import uuid
from contextlib import contextmanager
from datetime import date
from platform import system
from random import *

import docker
import paramiko
from requests import head
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.color import Color

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.docker_api import DockerApi
from NoptixLibrary.server_api import INITIAL_PASSWORD
from NoptixLibrary.server_api import ServerApi

logger = logging.getLogger(__name__)


class GenericKeywords:
    def __init__(self):
        self.cloud_host = "https://cloud-test.hdw.mx"
        self.docker_host_ip = "10.1.5.48"
        self.docker_host_username = "qaburbank"
        self.docker_host_password = "QABurbank777$"
        self.image = "5.1"
        self.password = "qweasd 123"
        self.from_email = False
        self.base_email = "noptixautoqa+sendemail@gmail.com"
        self.language = "en_US"

        self.permissions = {
            "cloudAdmin": "GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
            "viewer": "GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission",
            "liveViewer": "GlobalAccessAllMediaPermission",
            "advancedViewer": "GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
            "custom": "NoGlobalPermissions",
        }
        self.cloud_api = CloudPortalAPI(env=self.cloud_host)
        self.docker_api = DockerApi()

    def get_random_email(self, email, sendemail=False, extra="", symbols=False):
        if not sendemail:
            email = email.replace('sendemail', '')
        if symbols:
            index = email.find('@')
            email = email[:index] + \
                    "!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
            return email
        else:
            index = email.find('@')
            email = email[:index] + str(time.time()) + str(randint(1, 100)) + extra + email[index:]
            return email

    def get_many_random_emails(self, how_many, email):
        emails = []
        for x in range(0, int(how_many)):
            emails.append(self.get_random_email(email))
            time.sleep(.2)
        return emails

    def get_random_symbol_email(self, email):
        index = email.find('@')
        email = email[:index] + \
                "+!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
        return email

    def get_code_from_email_link(self, url):
        url_parts = url.split('/')
        return url_parts[-1]

    def get_random_system_name(self):
        return "System: " + date.today().strftime("%m-%d-%y") + " " + str(randint(1, 100))

    def colors_are_same(self, color1, color2):
        return (Color.from_string(color1).rgba == Color.from_string(color2).rgba)

    def check_online_or_offline(self, elements, offlineText):
        offline_text_path = ".//span[contains(text(),'" + offlineText + "')]"
        for element in elements:
            try:
                if element.find_element_by_xpath(".//button[@ng-click='checkForm()']"):
                    print("online")
            except NoSuchElementException:
                try:
                    if element.find_element_by_xpath(offline_text_path):
                        print("offline")
                except:
                    raise NoSuchElementException

    ''' Get the email subject from an email in other languages

    Takes the email UID and the expected text of the email subject.
    The important part of this is in the for loop.  First we take the 2nd item
    in the subject, which is the actual subject text, and decode it from ascii
    so that it is not a byte string.  Then use decode_header to decode the
    base64 string into unicode bytes.  Then finally we take that string and
    decode with UTF-8 to get the actual text.  Note that in some cases decoding
    UTF-8 is unnecessary (english, spanish, etc.) so the else statement clears
    any remaining junk.  Here is the process:

    1.  Initial value:  b'Subject: =?utf-8?b?INCQ0LrRgtC40LLQuNGA0YPQudGC0LUg0YPRh9C10YLQvdGD0Y4g0LfQsNC/?=\r\n =?utf-8?b?0LjRgdGM?=\r\n\r\n'
    2.  Decoded ASCII:  Subject: =?utf-8?b?INCQ0LrRgtC40LLQuNGA0YPQudGC0LUg0YPRh9C10YLQvdGD0Y4g0LfQsNC/?= =?utf-8?b?0LjRgdGM?=
    3.  Decoded header: [(b'Subject: ', None), (b' \xd0\x90\xd0\xba\xd1\x82\xd0\xb8\xd0\xb2\xd0\xb8\xd1\x80\xd1\x83\xd0\xb9\xd1\x82\xd0\xb5 \xd1\x83\xd1\x87\xd0\xb5\xd1\x82\xd0\xbd\xd1\x83\xd1\x8e \xd0\xb7\xd0\xb0\xd0\xbf\xd0\xb8\xd1\x81\xd1\x8c', 'utf-8')]
    4.  Decoded UTF-8 and subbed:  Активируйте учетную запись
    '''

    def check_email_subject(self, email_id, sub_text, email_address, password, host, port):
        conn = imaplib.IMAP4_SSL(host, int(port))
        conn.login(email_address, password)
        conn.select()
        typ, data = conn.uid(
            'fetch', email_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
        for res in data:
            if isinstance(res, tuple):
                # Decoding ascii and header
                header = email.header.decode_header(
                    res[1].decode('ascii').strip())
                # Decoding utf-8
                header_str = "".join([x[0].decode(
                    'utf-8').strip() if x[1] else re.sub("(^b\'|\')", "", str(x[0])) for x in
                                      header])
                # Removing the word "Subject:" from the string
                header_str = re.sub("Subject:", "", header_str)
                if sub_text != header_str.strip():
                    raise Exception(header_str + ' was not ' + sub_text)
        conn.logout()

    def check_file_exists(self, url):
        linkInfo = head(url)
        print(linkInfo)
        if int(linkInfo.status_code) == 200 and 'Content-Length' in linkInfo.headers.keys() and int(
                linkInfo.headers['Content-Length']) > 1000:
            return
        else:
            raise Exception("File does not appear to be available.")

    def get_os(self):
        plat = system()
        if plat == "Windows":
            return "Windows"
        elif plat == "Darwin":
            return "MacOS"
        elif plat == "Linux":
            return "Linux"
        else:
            raise Exception("Mismatched platform")

    def check_email_button(self, body, env, color):
        pat = '(<a class="btn" href="{})(.[^>]*)(background-color: {};)'.format(
            env, color)
        if re.search(pat, body) == None:
            raise Exception("Button background-color was not found.")

    def check_email_user_names(self, body, fName, lName):
        pat = '(<h1.*>).*({} {}.*</h1>)'.format(fName, lName)
        if re.search(pat, body) == None:
            raise Exception("User name was not in the email.")

    def check_email_cloud_name(self, body, cloudName):
        pat = '(<p).*({}).*(</p>)'.format(cloudName)
        if re.search(pat, body) == None:
            raise Exception("Cloud name was not in the email.")

    def check_for_blank_target(self, body, url):
        pat = '(<a class="btn" href="{})(.[^>]*)(target=_blank)'.format(url)
        if re.search(pat, body) == None:
            raise Exception("Button target was not 'blank'.")

    # def create_custom_network(self, network_name, num, internal=False):
    #     client = docker.from_env()
    #     ipam_pool = docker.types.IPAMPool(
    #         subnet=f'192.28.{num}.0/24',
    #         iprange=f'192.28.{num}.0/24',
    #         gateway=f'192.28.{num}.254'
    #     )
    #     ipam_config = docker.types.IPAMConfig(
    #         pool_configs=[ipam_pool]
    #     )
    #     net = client.networks.create(
    #         f'{network_name}',
    #         driver='bridge',
    #         ipam=ipam_config,
    #         internal=internal
    #     )
    #
    #     return net.id

    # def remove_custom_network(self, network_id):
    #     client = docker.from_env()
    #     net = client.networks.get(network_id)
    #     net.remove()

    def build_image(self, env):
        version = ""
        suffix = "test"
        if env == "https://cloud-test.hdw.mx":
            version = "4.1.0.30618"
        elif env == "https://cloud-dev3.hdw.mx":
            version = "4.1.0.30027"
        elif env == "https://test4.cloud.hdw.mx":
            version = "4.1.0.30298"
        elif env == "https://dev2.cloud.hdw.mx":
            version = "4.1.0.30308"
            suffix = "dev"
        client = docker.from_env()
        return client.images.build(path=f"{os.getcwd()}/Docker",
                                   tag="mergemediaserver",
                                   buildargs={
                                       "mediaserver_deb": f"nxwitness-server-{version}-linux64-beta-{suffix}.deb"})

    def get_image_id(self, image_name):
        client = docker.from_env()
        image = client.images.get(image_name)
        return image.id

    def is_port_in_use(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    def run_container(self, image_name, port, network='host'):
        prefix = 'AA'
        suffix = ':'.join('%02x' % randint(0, 255) for x in range(5))
        random_mac = ':'.join((prefix, suffix)).upper()
        if network == 'host':
            cmd = f'docker run -d --name {image_name}_{port} --restart=always -e PORT={port} --network={network} -t {image_name}'
        else:
            cmd = f'docker run -d --name {image_name}_{port} --restart=always --mac-address={random_mac} -p {port}:7001 --network={network} -t {image_name}'

        subprocess.run(cmd, shell=True)

        client = docker.client.from_env()
        running_containers = client.containers.list()
        for c in running_containers:
            if c.name == f'{image_name}_{port}':
                return c.name
        else:
            return 'Container is not running'

    def get_container_id(self, name):
        """ First 12 symbols of the container id """
        client = docker.from_env()
        container = client.containers.get(name)
        all_containers = client.containers.list(all=True)
        if container in all_containers:
            return container.id[:12]
        else:
            return 'Container not found'

    def remove_images(self):
        client = docker.from_env()
        imgs = client.images.list(name="mergemediaserver")
        for img in imgs:
            client.images.remove(img.id)

    def chrome_options_for_push_notifications(self):
        options = webdriver.ChromeOptions()
        options.add_argument("--disable-infobars")
        options.add_argument("start-maximized")
        options.add_argument("--disable-extensions")
        # options.add_argument("--disable-gpu")
        # options.add_argument("--headless")
        options.add_experimental_option("prefs", {
            "profile.default_content_setting_values.notifications": 1,
        })
        return options

    def push_notifications_swarm(self, slaves, users, ramp, seconds):
        txtFile = str(uuid.uuid1())
        f = open(f"{txtFile}.txt", "w+")
        f.write("1\n")
        f.close()
        os.environ['LOCUSTTEXT'] = txtFile
        users = int(users)
        ramp = int(ramp)
        slaves = int(slaves)
        seconds = int(seconds)
        #        cmd = f". Load-Testing/run_load_test_gui.sh Load-Testing/push.py {slaves}"
        #        print(f"Browse to http://localhost:8089/ use {slaves} slaves and {users} users")
        cmd = f". Load-Testing/run_load_test.sh Load-Testing/push.py {slaves} {users} {ramp} {seconds}s"
        print(cmd)
        os.system(cmd)

    def push_notification_pabot_command(self, max):
        txtFile = str(uuid.uuid1())
        f = open(f"{txtFile}.txt", "w+")
        f.write("LOG OF RESPONSES\n\n")
        f.close()
        os.environ['LOCUSTTEXT'] = txtFile
        cmd = f"pabot --testlevelsplit --processes 10 --variable max:{max} --outputdir Load-Testing Load-Testing/push_notifications_pabot.robot"
        #       print(cmd)
        os.system(cmd)

    def systems_to_check(self, systemsCount):
        return min(4, systemsCount)

    def show_additional(self, systemTileCount, systemTilesToShow):
        return systemTileCount > systemTilesToShow

    def get_tiles_to_show(self, systemCount, maxSystems):
        return systemCount if systemCount == maxSystems else min(systemCount, maxSystems - 1)

    def check_grid_size(self, gridSize, tileSize, columns):
        return gridSize > (tileSize * columns)

    def dictionary_should_contain(self, dictionary, expected):
        for item in dictionary:
            if item == expected:
                return

    def remove_user_by_email(self, serverUrl, email):
        users = ServerApi(serverUrl).get_users()
        for user in users:
            if user['email'] == email:
                ServerApi(serverUrl).remove_user(user['id'])

    def detect_language(self, text):
        from googletrans import Translator
        detected_langs = str(Translator().detect(text))
        return detected_langs

    def Get_Cloud_User_Id_By_Email(self, auth, email, systemId):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user == email:
                return user["vmsUserId"]

    def Convert_Code(self, code):
        code = re.sub(code, "%3D")
        code = re.sub(code, "%2b")
        return code

    def Get_Cloud_User_Role(self, auth, email, systemId):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user["accountEmail"] == email:
                return user["accessRole"]

    def User_Is_In_Cloud_System(self, email, systemId, auth):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user["accountEmail"] == email:
                return True

    def Add_user_to_cloud_system_if_not_there(self, systemId, accessRole, email, auth):
        isThere = self.User_Is_In_Cloud_System(email, systemId, auth)
        if isThere:
            logger.info(email + " already in system")
        else:
            r = self.cloud_api.share(
                auth,
                systemId,
                accessRole,
                email,
                self.permissions[accessRole],
                )
            logger.info(r)

    def Add_Cloud_Users(self, auth, users, systemId):
        for permission in users:
            self.Add_user_to_cloud_system_if_not_there(
                systemId,
                permission,
                users[permission],
                auth,
                )

    @contextmanager
    def _ssh_client(self):
        with paramiko.SSHClient() as ssh_client:
            ssh_client.load_system_host_keys()
            ssh_client.connect(
                self.docker_host_ip,
                username=self.docker_host_username,
                password=self.docker_host_password,
                )
            yield ssh_client

    def delete_docker_server(self, name):
        command = f'''docker container ls --filter='name={name}' --format='{{{{.Names}}}}' | xargs docker container rm -f'''
        logger.debug(command)
        with self._ssh_client() as ssh_client:
            _, _, ssh_stderr = ssh_client.exec_command(command)
        error = ssh_stderr.read()
        if error:
            raise Exception(f'Failed to stop server: {error}')

    def teardown_servers(self, serversJson):
        # Disconnect each server from cloud
        # Stop and remove docker container
        for server in serversJson:
            if server.get("cloudOwner"):
                self.cloud_api.disconnect(server["cloudOwner"], self.password, server["id"])
            self.docker_api.delete_container(server["container"])
            # Delete each user's account if they were added
            for user in server["cloudUsers"]:
                self.cloud_api.delete_account(server["cloudUsers"][user], self.password)
        # Delete the owner account
        if server.get("cloudOwner"):
            self.cloud_api.delete_account(server["cloudOwner"], self.password)

    def get_features_json(self, path):
        with codecs.open(path, encoding="utf-8") as featuresJson:
            featuresDict = json.load(featuresJson)
            return featuresDict

    def cleanup_containers(self, run_name):
        for container in self.docker_api.list_containers():
            if run_name in container["Names"][0]:
                self.docker_api.delete_container(container["Id"])

    def evaluate_system_settings_via_API(self, auth, server_url, key, expected_value):
        username, password = auth
        settings = ServerApi(server_url, username, password).get_system_settings_from_server()
        expected_value_str = str(expected_value)
        expected_value_str = (expected_value_str
                              .replace("empty", "")
                              .replace("true", "True")
                              .replace("false", "False")
                              .replace("\"", "'"),
                              )
        value = settings[key]
        if type(value) == str and "{" in value:
            value = value.replace(" ", "")
        if str(value) != expected_value_str:
            raise RuntimeError(f"value({value}) did not match expected({expected_value_str})")

    def evaluate_log_level_via_API(self, auth, server_url, key, value):
        username, password = auth
        logLevel = ServerApi(server_url, username, password).get_log_level()
        if logLevel.get(key) and logLevel[key] == value.lower():
            pass
        else:
            raise RuntimeError(f"Value({value}) was not in log level response {logLevel}")

    def verify_changed_info_via_API(self, new_locals, ip, local_user="ocal+"):
        locals = []
        users = ServerApi(ip).get_users()
        local_state = True
        for user in users:
            if user.get("isCloud") is False:
                local_state = False
            elif user.get("type") == "cloud":
                local_state = False
            if local_state and local_user in user['name']:
                locals.append(user)
        shortened_dict = []
        for user in locals:
            shortened_dict.append({
                "name": user["name"],
                "fullName": user["fullName"],
                "permissions": user["permissions"],
                "email": user["email"],
                })
        for user in shortened_dict:
            if user["name"] not in new_locals:
                raise RuntimeError("All info was not changed")

    def delete_all_local_users_via_API(self, token, server, locals_list):
        for user in locals_list:
            ServerApi(server).remove_user(user['id'])

    def check_user_full_name_is_none(self, name, check_info):
        if not any(name in user["name"] and user["fullName"] == '' for user in check_info):
            raise RuntimeError(
                f"User with name {name} does not exist or does not have an empty fullName.")

    def check_user_email_is_none(self, name, check_info):
        if not any(name in user["name"] and user["email"] == '' for user in check_info):
            raise RuntimeError(
                f"User with name {name} does not exist or does not have an empty email.")

    def restart_docker_servers(self, servers):
        for server in servers:
            self.docker_api.restart_container(server['container'])
            time.sleep(1)

    def get_container_port_by_name(self, name):
        r = self.docker_api.get_container_by_name(name)
        return r.json()['Ports'][0]['PublicPort']

    def check_language_logged_in(self, email, password):
        current_lang = self.cloud_api.get_account_language(email, password)
        if current_lang == self.language:
            self.cloud_api.set_account_language(email, password, self.language)
        time.sleep(2)

    def restore_password_using_api(self, email, new_password):
        assert self.cloud_api.api_restore_password(email, 'None', 'None') == '200'
        code = self.convert_code(self.cloud_api.get_code_from_api(email, 'restore_password'))
        assert self.cloud_api.api_restore_password(email, code, new_password) == '200'

    def create_virtual_disk(self, disk_location, disk_name, disk_size, disk_target):
        self.execute_sudo_command(
            f'dd if=/dev/zero of={disk_location}/{disk_name}.img bs=1M count={disk_size}')
        self.execute_sudo_command(f'mkfs -t ext4 {disk_location}/{disk_name}.img')
        self.execute_sudo_command(f'mkdir {disk_name}')
        _, ssh_stdout, _ = self.execute_sudo_command(
            f'mount -t auto -o loop {disk_location}/{disk_name}.img {disk_name}')
        logger.debug(ssh_stdout.read)
        disk = {
            "img": f"${disk_location}/{disk_name}.img",
            "folder": disk_name,
            "size": disk_size,
            "target": disk_target,
            "bind": f"/home/qaburbank/{disk_name}:/{disk_target}",
            }
        return disk

    def delete_virtual_disk(self, disk):
        self.execute_sudo_command(f"umount {disk['folder']}")
        self.execute_sudo_command(f"rm {disk['img']}")
        self.execute_sudo_command(f"rm -r {disk['folder']}")

    def make_directory(self, dir_name):
        self.execute_sudo_command(f"mkdir {dir_name}")

    def remove_directory(self, dir_name):
        self.execute_sudo_command(f"rm -r {dir_name}")

    def remove_all_files(self, dir_name):
        self.execute_sudo_command(f"rm {dir_name}/* ")

    def verify_file_exists(self, folder, file):
        _, ssh_stdout, _ = self.execute_sudo_command(f"find {folder} -name {file}")
        assert file in ssh_stdout

    def execute_sudo_command(self, command):
        with self._ssh_client() as ssh_client:
            stdin, stdout, stderr = ssh_client.exec_command(f'sudo {command}', get_pty=True)
            stdin.write(self.docker_host_password + '\n')
            stdin.flush()
            logger.debug(stdout.read())
        return stdin, stdout, stderr

    def get_local_users(self, token, server_url):
        locals_list = []
        users = ServerApi(server_url).get_users()
        for user in users:
            local_state = True
            if user.get("isCloud"):
                local_state = False
            elif user.get("type") == "cloud":
                local_state = False
            if local_state and user["name"] != "admin":
                locals_list.append(user)
        return locals_list
