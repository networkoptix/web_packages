#!/usr/bin/env python
# -*- coding: utf-8 -*-
import codecs
import string
import docker
import email.header
import imaplib
import json
import os
import paramiko
import re
import socket
import subprocess
import time
import uuid

from contextlib import contextmanager
from datetime import date
from platform import system
from random import *
from requests import head
from robot.libraries.BuiltIn import BuiltIn
from robot.api import logger
from robot.api.deco import keyword, library
from ServerAPI5 import ServerAPI5
from CloudPortalAPI import CloudPortalAPI
from DockerApi import DockerApi


from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, InvalidArgumentException, StaleElementReferenceException
from selenium.webdriver.support.color import Color
from selenium.webdriver.remote.webelement import WebElement
from googletrans import Translator

@library
class GenericKeywords(object):
    def __init__(self):
        self.cloud_host = BuiltIn().get_variable_value("${ENV}")
        self.docker_host_ip = BuiltIn().get_variable_value("${QA BURBANK IP}")
        self.docker_host_username = BuiltIn().get_variable_value("${QA BURBANK USER}")
        self.docker_host_password = BuiltIn().get_variable_value("${QA BURBANK PASS}")
        self.image = BuiltIn().get_variable_value("${IMAGE}")
        self.password = BuiltIn().get_variable_value("${BASE PASSWORD}")
        self.from_email = BuiltIn().get_variable_value("${FROM EMAIL DEFAULT}")
        self.base_email = BuiltIn().get_variable_value("${BASE EMAIL}")
        self.language = BuiltIn().get_variable_value("${LANGUAGE}")
        self.permissions={
            "cloudAdmin":"GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
            "viewer":"GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission",
            "liveViewer":"GlobalAccessAllMediaPermission",
            "advancedViewer":"GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission",
            "custom":"NoGlobalPermissions"
            }
        self.cloud_api = CloudPortalAPI(env=self.cloud_host)
        self.server_api = ServerAPI5()
        self.docker_api = DockerApi()

    @keyword
    def go_forward(self):
        """Simulates the user clicking the forward button on their browser."""
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        seleniumlib.driver.forward()

    @keyword
    def convert_locator_to_webelement(self, locator):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        logger.debug('Attempting to convert locator to WebElement...')

        if type(locator) is WebElement:
            logger.debug('Already a WebElement.')
            return locator
        elif type(locator) is str:
            try:
                element = seleniumlib.find_element(locator)
                logger.debug('Converted to WebElement')
                return element
            except:
                raise AssertionError('Failure to convert locator to WebElement!')

    @keyword
    def get_hidden_inner_html(self, locator):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        element = seleniumlib.driver.find_element_by_xpath(locator)
        text = element.get_attribute('innerHTML')
        return text

    @keyword
    def copy_text(self, locator):
        locator = self.convert_locator_to_webelement(locator)
        if self.get_os() == "MacOS":
            locator.send_keys(Keys.SHIFT, Keys.UP)
            locator.send_keys(Keys.CONTROL, Keys.INSERT)
        else:
            locator.send_keys(Keys.CONTROL + 'a')
            locator.send_keys(Keys.CONTROL + 'c')

    @keyword
    def paste_text(self, locator):
        locator = self.convert_locator_to_webelement(locator)
        if self.get_os() == "MacOS":
            locator.send_keys(Keys.SHIFT, Keys.INSERT)
        else:
            locator.send_keys(Keys.CONTROL + 'v')

#     def delete_all_text(self, locator):
#         seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
#         element = seleniumlib.find_element(locator)
#         text = seleniumlib.get_text(locator)
#         logger.debug(text)
#         element.send_keys(Keys.END)
#         for x in range(len(text)):
#             element.send_keys(Keys.BACKSPACE)
    @keyword
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

    @keyword
    def get_many_random_emails(self, how_many, email):
        emails = []
        for x in range(0, int(how_many)):
            emails.append(self.get_random_email(email))
            time.sleep(.2)
        return emails

    @keyword
    def get_random_symbol_email(self, email):
        index = email.find('@')
        email = email[:index] + \
                "+!#$%'*-/=?^_`{|}~" + str(time.time()) + email[index:]
        return email

    @keyword
    def get_code_from_email_link(self, url):
        url_parts = url.split('/')
        return url_parts[-1]

    @keyword
    def get_random_system_name(self):
        return "System: " + date.today().strftime("%m-%d-%y") + " " + str(randint(1, 100))

    @keyword
    def get_element_style(self, locator, styleAttribute):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        not_found = None

        try:
            element = seleniumlib.find_element(locator)
            value = element.value_of_css_property(styleAttribute)
            logger.info('style: ' + styleAttribute + ', value: ' + value)
            return value
        except:
            not_found = f"No element found with style attribute {styleAttribute}"
        raise AssertionError(not_found)

    @keyword
    def element_style_should_be(self, locator, styleAttribute, expectedValue):
        observedValue = self.get_element_style(locator, styleAttribute)
        if observedValue == expectedValue:
            pass
        else:
            seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
            seleniumlib.capture_page_screenshot()
            raise AssertionError(f"Expected: {expectedValue}\nObserved: {observedValue}")

    @keyword
    def wait_until_textfield_contains(self, locator, expected, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        timeout = timeout + time.time()
        not_found = None

        while time.time() < timeout:
            try:
                element = seleniumlib.find_element(locator)
                value = element.get_attribute('value')
                if value == expected:
                    return
            except:
                pass
            time.sleep(.2)
        raise Exception(f"No element found with text {expected}")

    @keyword
    def wait_until_element_has_style(self, locator, styleAttribute, expected, timeout=10):
        timeout = timeout + time.time()
        not_found = "No element found with style " + expected
        value = ""
        while time.time() < timeout:
            try:
                value = self.get_element_style(locator, styleAttribute)
                logger.debug(f"value of get element style: {value}")
                if value == expected:
                    return
            except Exception as e:
                print(e)
                not_found = f"{value} does not equal the expected {expected}"
            time.sleep(.2)
        raise AssertionError(not_found)

    @keyword
    def wait_until_element_contains_style(self, locator, styleAttribute, expected, timeout=10):
        timeout = timeout + time.time()
        not_found = "No element found with style " + expected
        value = ""
        while time.time() < timeout:
            try:
                value = self.get_element_style(locator, styleAttribute)
                logger.debug(value)
                if expected in value:
                    return
            except Exception as e:
                print(e)
                not_found = f"{value} does not contains the expected {expected}"
            time.sleep(.2)
        raise AssertionError(not_found)

    @keyword
    def wait_until_element_has_class(self, locator, expected, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        timeout = timeout + time.time()
        not_found = None

        while time.time() < timeout:
            try:
                element = seleniumlib.find_element(locator)
                classAttribute = element.get_attribute('class')
                if expected in classAttribute:
                    return
            except:
                not_found = f"No element found with class {expected}"
            time.sleep(.2)
        raise AssertionError(not_found)

    @keyword
    def wait_until_element_does_not_have_class(self, locator, expected, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        timeout = timeout + time.time()
        found = None

        while time.time() < timeout:
            try:
                element = seleniumlib.find_element(locator)
                classAttribute = element.get_attribute('class')
                if expected not in classAttribute:
                    return
            except:
                found = f"Element found with class '{expected}' when it was not expected"
            time.sleep(.2)
        raise AssertionError(found)

    @keyword
    def wait_until_table_cell_does_not_contain_text(self, locator, expected, row, column, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        timeout = timeout + time.time()
        found = None

        while time.time() < timeout:
            try:
                text = seleniumlib.get_table_cell(locator, row, column)
                if text != expected:
                    return
            except:
                found = f"Table cell still had '{expected}' in it."
            time.sleep(.2)
        raise AssertionError(found)

    @keyword
    def wait_until_number_of_tabs_are_open(self, number, timeout=30):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        timeout = timeout + time.time()
        found = None
        while time.time() < timeout:
            try:
                handles = seleniumlib.get_window_handles()
                logger.debug(len(handles))
                logger.debug(number)
                if str(len(handles)) == str(number):
                    return
            except:
                found = f"Looking for {number} tabs, found {len(handles)} tabs."
            time.sleep(.2)
        raise AssertionError(found)

    @keyword
    def colors_are_same(self, color1, color2):
        return (Color.from_string(color1).rgba == Color.from_string(color2).rgba)

    @keyword
    def verify_button_arrow_direction(self, locator, expected, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        not_found = "No button arrow elements found"
        # expected is 'Up' or 'Down'
        expected = expected.strip().lower()
        logger.debug('expected: ' + expected)

        logger.debug('locator: ' + locator)

        navArrows = "//div[@class='nav-arrow']/span"
        logger.debug('navArrows: ' + navArrows)

        locators = locator + navArrows
        logger.debug('locators: ' + locators)

        # 'rotate(45deg)'
        pos = 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)'
        # 'rotate(-45deg)'
        neg = 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)'

        logger.debug('pos: ' + pos)
        logger.debug('neg: ' + neg)

        # First, find parent element
        to = timeout + time.time()
        element = None
        while (time.time() < to and element is None):
            try:
                element = seleniumlib.find_element(locator)
                logger.debug('element: ' + str(element))
            except:
                pass
            time.sleep(.2)
        if (element is None):
            raise AssertionError(not_found)

        # Next, find child arrow elements
        to = timeout + time.time()
        elements = None
        while (time.time() < to and elements is None):
            try:
                elements = seleniumlib.find_elements(locators)
                logger.debug('elements count: ' + str(len(elements)))
                logger.debug('elements: ' + str(elements))
            except:
                pass
            time.sleep(.2)
        if (len(elements) == 0):
            raise AssertionError(not_found)

        logger.debug('elements[0]: ' + str(elements[0]))
        logger.debug('elements[1]: ' + str(elements[1]))

        # Then, determine the transform values
        span1 = elements[0].value_of_css_property('transform')
        span2 = elements[1].value_of_css_property('transform')

        logger.debug('span1: ' + str(span1))
        logger.debug('span2: ' + str(span2))

        # Finally, check that the values match expectation
        if expected == 'up':
            logger.debug('span1?=' + neg)
            logger.debug('span2?=' + pos)
            if span1 == neg and span2 == pos:
                logger.info('result: ' + expected)
                return
            else:
                raise AssertionError(not_found)
        elif expected == 'down':
            logger.debug('span1?=' + pos)
            logger.debug('span2?=' + neg)
            if span1 == pos and span2 == neg:
                logger.info('result: ' + expected)
                return
            else:
                raise AssertionError(not_found)

    @keyword
    def check_online_or_offline(self, elements, offlineText):
        for element in elements:
            try:
                if element.find_element_by_xpath(".//button[@ng-click='checkForm()']"):
                    print("online")
            except NoSuchElementException:
                try:
                    if element.find_element_by_xpath(".//span[contains(text(),'" + offlineText + "')]"):
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

    @keyword
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
                    'utf-8').strip() if x[1] else re.sub("(^b\'|\')", "", str(x[0])) for x in header])
                # Removing the word "Subject:" from the string
                header_str = re.sub("Subject:", "", header_str)
                if sub_text != header_str.strip():
                    raise Exception(header_str + ' was not ' + sub_text)
        conn.logout()

    @keyword
    def get_browser_log(self):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        return seleniumlib.driver.get_log('browser')

    @keyword
    def check_file_exists(self, url):
        linkInfo = head(url)
        print(linkInfo)
        if int(linkInfo.status_code) == 200 and 'Content-Length' in linkInfo.headers.keys() and int(linkInfo.headers['Content-Length']) > 1000:
            return
        else:
            raise Exception("File does not appear to be available.")

    @keyword
    def check_in_list(self, expected, found):
        for url in expected:
            if found in url:
                return
            elif re.search(url, found):
                return
        raise Exception(found + " was not in the expected list.")

    @keyword
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

    @keyword
    def check_email_button(self, body, env, color):
        pat = '(<a class="btn" href="{})(.[^>]*)(background-color: {};)'.format(
            env, color)
        if re.search(pat, body) == None:
            raise Exception("Button background-color was not found.")

    @keyword
    def check_email_user_names(self, body, fName, lName):
        pat = '(<h1.*>).*({} {}.*</h1>)'.format(fName, lName)
        if re.search(pat, body) == None:
            raise Exception("User name was not in the email.")

    @keyword
    def check_email_cloud_name(self, body, cloudName):
        pat = '(<p).*({}).*(</p>)'.format(cloudName)
        if re.search(pat, body) == None:
            raise Exception("Cloud name was not in the email.")

    @keyword
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

    @keyword
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

    @keyword
    def get_image_id(self, image_name):
        client = docker.from_env()
        image = client.images.get(image_name)
        return image.id

    @keyword
    def get_random_mac(self):
        prefix = 'AA'
        suffix = ':'.join('%02x' % randint(0, 255) for x in range(5))
        random_mac = ':'.join((prefix, suffix)).upper()
        return random_mac

    @keyword
    def is_port_in_use(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    @keyword
    def get_random_port_from_docker_server(self):
        usedPorts = []
        for container in self.docker_api.list_containers():
            for usedPort in container["Ports"]:
                usedPorts.append(usedPort["PublicPort"])
        port = randint(30000, 65535)
        while port in usedPorts:
            port = randint(30000, 65535)        
        return str(port)

    @keyword
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

    @keyword
    def get_container_id(self, name):
        """ First 12 symbols of the container id """
        client = docker.from_env()
        container = client.containers.get(name)
        all_containers = client.containers.list(all=True)
        if container in all_containers:
            return container.id[:12]
        else:
            return 'Container not found'

    @keyword
    def remove_images(self):
        client = docker.from_env()
        imgs = client.images.list(name="mergemediaserver")
        for img in imgs:
            client.images.remove(img.id)

    @keyword
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

    @keyword
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

    @keyword
    def push_notification_pabot_command(self, max):
        txtFile = str(uuid.uuid1())
        f = open(f"{txtFile}.txt", "w+")
        f.write("LOG OF RESPONSES\n\n")
        f.close()
        os.environ['LOCUSTTEXT'] = txtFile
        cmd = f"pabot --testlevelsplit --processes 10 --variable max:{max} --outputdir Load-Testing Load-Testing/push_notifications_pabot.robot"
        #       print(cmd)
        os.system(cmd)

    @keyword
    def systems_to_check(self, systemsCount):
        return min(4, systemsCount)

    @keyword
    def show_additional(self, systemTileCount, systemTilesToShow):
        return systemTileCount > systemTilesToShow

    @keyword
    def get_tiles_to_show(self, systemCount, maxSystems):
        return systemCount if systemCount == maxSystems else min(systemCount, maxSystems - 1)
       
    @keyword 
    def check_grid_size(self, gridSize, tileSize, columns):
        return gridSize > (tileSize * columns)

    @keyword
    def check_if_match_and_criteria(self, locator, criteria):
        queries = set(criteria.lower().split())
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')

        elements = seleniumlib.find_elements(locator)
        for element in elements:
            try:
                highlights = element.find_elements_by_xpath(".//span[@class='highlighted']")
                matches = set()
                for highlight in highlights:
                    matches.add(highlight.get_attribute('innerHTML').lower())

            except NoSuchElementException:
                raise NoSuchElementException

            if len(queries - matches) > 0 or len(matches - queries) > 0:
                raise InvalidArgumentException("Matches found don't reflect search")

        return True

    @keyword
    def check_if_match_or_criteria(self, locator, criteria):
        queries = criteria.lower().split("|")
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')

        elements = seleniumlib.find_elements(locator)
        for element in elements:
            try:
                seleniumlib.driver.execute_script("arguments[0].scrollIntoView();", element)
                time.sleep(.2)
                highlights = element.find_elements_by_xpath(".//span[@class='highlighted']")
                for highlight in highlights:
                    if highlight.get_attribute('innerHTML').lower() not in queries:
                        raise InvalidArgumentException("Matches found don't reflect search")

            except NoSuchElementException:
                raise NoSuchElementException
            except StaleElementReferenceException:
                raise StaleElementReferenceException

        return True

    @keyword
    def dictionary_should_contain(self, dictionary, expected):
        for item in dictionary:
            if item==expected:
                return
            
    @keyword
    def remove_user_by_email(self, auth, serverUrl, email, image):
        if image == '4.2':
            users = ServerAPI.get_users(self, auth, serverUrl)
            for user in users:
                if user['email']==email:
                    ServerAPI.remove_user(self, auth, serverUrl, user['id'])
        else:
            users = ServerAPI5.get_users(self, auth, serverUrl)
            for user in users:
                if user['email'] == email:
                    ServerAPI5.remove_user(self, auth, serverUrl, user['id'])

    @keyword
    def detect_language(self, text):
        detected_langs = str(Translator().detect(text))
        return detected_langs

    @keyword
    def Get_Cloud_User_Id_By_Email(self, auth, email, systemId):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user == email:
                return user["vmsUserId"]

    @keyword
    def Convert_Code(self, code):
        code = re.sub(code, "%3D")
        code = re.sub(code, "%2b")
        return code

    @keyword
    def Get_Cloud_User_Role(self, auth, email, systemId):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user["accountEmail"] == email:
                return user["accessRole"]

    @keyword
    def User_Is_In_Cloud_System(self, email, systemId, auth):
        users = self.cloud_api.get_cloud_system_users(auth, systemId)
        for user in users:
            if user["accountEmail"] == email:
                return True
                
    @keyword
    def Add_user_to_cloud_system_if_not_there(self, systemId, accessRole, email, auth):
        isThere = self.User_Is_In_Cloud_System(email, systemId, auth)
        if isThere:
            logger.info(email + " already in system")
        else:
            r = self.cloud_api.share(auth, systemId, accessRole, email, self.permissions[accessRole])
            logger.info(r)

    @keyword
    def Add_Cloud_Users(self, auth, users, systemId):
        for permission in users:
            self.Add_user_to_cloud_system_if_not_there(systemId, permission, users[permission], auth)

    @contextmanager
    def _ssh_client(self):
        with paramiko.SSHClient() as ssh_client:
            ssh_client.load_system_host_keys()
            ssh_client.connect(
                self.docker_host_ip, username=self.docker_host_username, password=self.docker_host_password)
            yield ssh_client


    @keyword
    def create_systems(self):
        jsonPath = os.path.join(
            "Resources",
            "front-end-resources", 
            f"{BuiltIn().get_variable_value('${SUITE NAME}').lower()}.json".replace("test-cases.", "")
            )
        with open(jsonPath,  encoding="utf-8") as suite_json:
            serversJson = json.load(suite_json)
            runName = BuiltIn().get_variable_value('${random}')
            # if storage suite, binds will exist
            binds = BuiltIn().get_variable_value('${binds}')
            if binds:
                for idx in range(len(binds)):
                    serversJson[idx].update({"binds": binds[idx]})
            # Start Docker server for each server in the JSON
            for idx, server in enumerate(serversJson):
                server["name"] = f"{BuiltIn().get_variable_value('${SUITE NAME}').lower().replace('test-cases.', '')}_{idx}_"           
                server.update(self.create_docker_server(server, runName))
              
            
            # Set up systems
            time.sleep(5)
            for server in serversJson:
                self.server_api.setup_local_system(
                    f"https://{self.docker_host_ip}:{server['port'][0]}", "qweasd 123", server["name"])
            
            # Register and activate owner user(s)
            ownerRequired = False
            for server in serversJson:
                if 'cloudOwnerId' in server:
                    ownerRequired = True
                    break
            if ownerRequired:
                owners_ids = set([server["cloudOwnerId"] for server in serversJson])
                if "owner-transfer" in BuiltIn().get_variable_value('${SUITE NAME}').lower():
                    logger.info("owner-transfer detected")
                    owners = [self.get_random_email(self.base_email, sendemail=True) for _ in
                              range(len(owners_ids))]
                else:
                    logger.info("owner-transfer NOT detected")
                    owners = [self.get_random_email(self.base_email, sendemail=self.from_email) for _ in range (len(owners_ids))]
                for owner in owners:
                    res = self.cloud_api.register_account("mark", "hamill", owner, self.password)
                    logger.trace(res)
                    BuiltIn().run_keyword('Activate', owner)

            # Add owner users to json
            for server in serversJson:
                if 'cloudOwnerId' in server:
                    server["cloudOwner"] = owners[server["cloudOwnerId"]]
                
            # Connect systems to cloud
            for server in serversJson:
                if 'cloudOwnerId' in server:
                    serverId = self.server_api.API_connect_to_cloud(
                        [server["cloudOwner"], self.password], 
                        f"https://{self.docker_host_ip}:{server['port'][0]}",
                        self.cloud_host, 
                        name=server["name"])
                    server.update({"id": serverId})

            # add cloud and local auth lists
            for server in serversJson:
                server.update({"localAuth":["admin", self.password]})
                if 'cloudOwnerId' in server:
                    server.update({"cloudAuth":[server["cloudOwner"], self.password]})

            # get server token for authentication
            for server in serversJson:
                server["token"] = self.server_api.get_server_token(
                    server["localAuth"], f"https://{self.docker_host_ip}:{server['port'][0]}")
                
            # Add local users if required
            permissions = BuiltIn().get_variable_value('${permissions}')
            for server in serversJson:
                if server["addUsers"] == True:
                    localUsersNames = BuiltIn().get_variable_value('${role names}').keys()
                    localUsers={}
                    for user in localUsersNames:
                        self.server_api.save_user(
                            server["token"],
                            f"https://{self.docker_host_ip}:{server['port'][0]}",
                            "Local+"+user, 
                            permissions[user], 
                            f"noptixautoqa+local_{user}@gmail.com",
                            "Local User",
                            self.password,
                            isCloud=False
                            )
                        localUsers.update({user:{"login":"Local"+user, "email": f"noptixautoqa+local_{user}@gmail.com"}})
                    server.update({"localUsers":localUsers})

                # Register, Activate, and Share cloud users if required
                if server['addUsers'] and 'cloudOwnerId' in server:
                    for server in serversJson:
                        for permission in permissions:
                            email = self.get_random_email(self.base_email, sendemail=self.from_email)
                            r = self.cloud_api.register_account("Mark", "Hamill", email, self.password)
                            logger.trace(email, r)
                            server["cloudUsers"].update({permission:email})
                        logger.trace(server["cloudUsers"])

                    for server in serversJson:
                        for user in server["cloudUsers"]:
                            BuiltIn().run_keyword('Activate', server["cloudUsers"][user], self.from_email)
                            self.Add_user_to_cloud_system_if_not_there(server["id"], user, server["cloudUsers"][user], [server["cloudOwner"], self.password])
                else:
                    logger.trace("Users not added")
        return serversJson


    def create_docker_server(self, server, runName):
        name = server['name'] +''.join(runName)
        mac = self.get_random_mac()
        ports = []
        for _ in range(server["ports"]):
            ports.append(self.get_random_port_from_docker_server())
        container = self.docker_api.create_container(ports, mac, name, server)  
        self.docker_api.start_container(container)  
        return {
            "name": name,
            "port": ports,
            "mac" : mac,
            "container": container
            }

    @keyword
    def delete_docker_server(self, name):
        command = f'''docker container ls --filter='name={name}' --format='{{{{.Names}}}}' | xargs docker container rm -f'''
        logger.trace(command)
        with self._ssh_client() as ssh_client:
            _, _, ssh_stderr = ssh_client.exec_command(command)
        error = ssh_stderr.read()
        if error:
            raise Exception(f'Failed to stop server: {error}')

    @keyword
    def teardown_servers(self, serversJson):
        # Disconnect each server from cloud
        # Stop and remove docker container
        for server in serversJson:
            self.cloud_api.disconnect(server["cloudOwner"], self.password, server["id"])
            self.docker_api.delete_container(server["container"])
            # Delete each user's account if they were added
            for user in server["cloudUsers"]:
                self.cloud_api.delete_account(server["cloudUsers"][user], self.password)
        # Delete the owner account
        self.cloud_api.delete_account(server["cloudOwner"], self.password)

    @keyword
    def get_features_json(self, path):
        with codecs.open(path, encoding="utf-8") as featuresJson:
            featuresDict = json.load(featuresJson)
            return featuresDict
    
    @keyword
    def cleanup_containers(self, run_name):
        for container in self.docker_api.list_containers():
            if run_name in container["Names"][0]:
                self.docker_api.delete_container(container["Id"])

    @keyword
    def create_local_users_via_api(self, token, server, locals, password):
        local_users = {
            "advancedViewer": {},
            "cloudAdmin": {},
            "custom": {},
            "liveViewer": {},
            "viewer": {}
        }
        logger.trace(f'create_local_users_via_api')
        for user in locals:
            self.server_api.save_user(
                token, 
                server, 
                f'Local+{user}', 
                self.permissions[user],
                f'noptixautoqa+local_{user}@gmail.com',
                'Local User',
                password,
                isCloud=False
                )
            local_users[user].update(
                login = f'Local+{user}',
                email = f'noptixautoqa+local_{user}@gmail.com'
                )
        return local_users

    @keyword
    def evaluate_system_settings_via_API(self, auth, server_url, key, expected_value):
        settings = self.server_api.get_system_settings_from_server(auth, server_url)
        expected_value_str = str(expected_value)
        expected_value_str = expected_value_str.replace("empty", "").replace("true", "True").replace("false", "False").replace("\"", "'")
        value = settings[key]
        if type(value) == str and "{" in value:
            value =   value.replace(" ", "")
        if str(value) != expected_value_str:
            raise RuntimeError(f"value({value}) did not match expected({expected_value_str})")

    @keyword
    def get_lang_list(self):
        jsonPath = os.path.join(
            "customizations",
            BuiltIn().get_variable_value('${CUST LANGUAGE LIST}')
            )
        with open(jsonPath,  encoding="utf-8") as langDict:
            return json.load(langDict)
    def evaluate_log_level_via_API(self, auth, server_url, key, value):
        logLevel= self.server_api.get_log_level(auth, server_url)
        if logLevel.get(key) and logLevel[key] == value.lower():
            pass
        else:
            raise RuntimeError(f"Value({value}) was not in log level response {logLevel}")

    @keyword
    def verify_changed_info_via_API(self, new_locals, ip, local_user="ocal+"):
        locals = []
        users = self.server_api.get_users(BuiltIn().get_variable_value('${servers}[0][token]'), ip)
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
                "email": user["email"]
                }
            )
        for user in shortened_dict:
            if user["name"] not in new_locals:
                raise RuntimeError("All info was not changed")
    
    @keyword
    def reset_local_users(self, auth, token, server, local_user='ocal+', password='BASE PASSWORD'):
        clean_locals = []
        locals_list = []
        local_users = list(BuiltIn().get_variable_value("${role_names}").keys())
        users = self.server_api.get_users(token, server)
        logger.trace(users)
        for user in users:
            local_state = True
            if user.get("isCloud") is False:
                local_state = False
                logger.trace(f"isCloud for {user['name']} is {local_state}")
            elif user.get("type") == "cloud":
                local_state = False
                logger.trace(f"local type for {user['name']} is {local_state}")
            if local_state and local_user in user['name']:
                locals_list.append(user)
                logger.trace(f"{user['name']} added to locals_list")
        logger.trace(f"locals_list: {locals_list}")
        if len(locals_list) == 5:
            self.reset_local_users_API(locals_list, token, server)
        elif len(clean_locals) < 5:
            self.create_new_local_users(
                len(locals_list), 
                auth, 
                server, 
                token, 
                local_users, 
                locals_list, 
                password
                )
        return local_users
    
    @keyword
    def reset_local_users_API(self, locals, token, server):
        for user in locals:
            name = user['name'].replace("_changed", "")
            user_type = name[6:]
            if user_type == 'cloudadmin':
                user_type = 'cloudAdmin'
            elif user_type == 'liveviewer':
                user_type = 'liveViewer'
            elif user_type == 'advancedviewer':
                user_type = 'advancedViewer'
            logger.trace(f'user_type={user_type}')
            self.server_api.save_user(
                token,
                server,
                f"Local+{user_type}",
                BuiltIn().get_variable_value("${permissions}")[user_type],
                f"noptixautoqa+local_{user_type}@gmail.com",
                "Local User",
                BuiltIn().get_variable_value("${BASE_PASSWORD}"),
                userId=user['id'],
                isCloud=False,
                patch=True
            )
            
    @keyword
    def create_new_local_users(self, count, auth, server, token, local_users, locals_list, password):
        if count == 0:
            self.create_local_users_via_api(token, server, local_users, password)
        else:
            self.delete_all_local_users_via_API(token, server, locals_list)
            self.create_local_users_via_api(token, server, local_users, password)
    
    @keyword
    def delete_all_local_users_via_API(self, token, server, locals_list):
        for user in locals_list:
            self.server_api.remove_user(token, server, user['id'])
    
    @keyword
    def check_user_full_name_is_none(self, name, check_info):
        if not any(name in user["name"] and user["fullName"] == '' for user in check_info):
            raise RuntimeError(f"User with name {name} does not exist or does not have an empty fullName.")

    @keyword
    def check_user_email_is_none(self, name, check_info):
        if not any(name in user["name"] and user["email"] == '' for user in check_info):
            raise RuntimeError(f"User with name {name} does not exist or does not have an empty email.")

        
    @keyword
    def restart_docker_servers(self, servers):
        for server in servers:
            self.docker_api.restart_container(server['container'])
            time.sleep(1)

    @keyword
    def get_container_port_by_name(self, name):
        r = self.docker_api.get_container_by_name(name)
        return r.json()['Ports'][0]['PublicPort']
    
    @keyword
    def check_language_logged_in(self, email, password):
        current_lang = self.cloud_api.get_account_language(email, password)
        if current_lang == self.language:
            self.cloud_api.set_account_language(email, password, self.language)
        time.sleep(2)
    
    @keyword
    def restore_password_using_api(self, email, new_password):
        assert self.cloud_api.api_restore_password(email, 'None', 'None') == '200'
        code = self.convert_code(self.cloud_api.get_code_from_api(email, 'restore_password'))
        assert self.cloud_api.api_restore_password(email, code, new_password) == '200'

    @keyword
    def create_virtual_disk(self, disk_location, disk_name, disk_size, disk_target):
        self.execute_sudo_command(f'dd if=/dev/zero of={disk_location}/{disk_name}.img bs=1M count={disk_size}')
        self.execute_sudo_command(f'mkfs -t ext4 {disk_location}/{disk_name}.img')
        self.execute_sudo_command(f'mkdir {disk_name}')
        _, ssh_stdout, _ = self.execute_sudo_command(f'mount -t auto -o loop {disk_location}/{disk_name}.img {disk_name}')
        assert ssh_stdout.channel.recv_exit_status() == 0
        disk = {
            "img": f"${disk_location}/{disk_name}.img",
            "folder": disk_name,
            "size": disk_size,
            "target": disk_target,
            "bind": f"/home/qaburbank/{disk_name}:/{disk_target}"
        }
        return disk

    @keyword
    def delete_virtual_disk(self, disk):
        self.execute_sudo_command(f"umount {disk['folder']}")
        self.execute_sudo_command(f"rm {disk['img']}")
        self.execute_sudo_command(f"rm -r {disk['folder']}")

    @keyword
    def make_directory(self, dir_name):
        self.execute_sudo_command(f"mkdir {dir_name}")

    @keyword
    def remove_directory(self, dir_name):
        self.execute_sudo_command(f"rm -r {dir_name}")
        
    @keyword
    def remove_all_files(self, dir_name):
        self.execute_sudo_command(f"rm {dir_name}/* ")

    @keyword
    def verify_file_exists(self, folder, file):
        _, ssh_stdout, _ = self.execute_sudo_command(f"find {folder} -name {file}")
        assert file in ssh_stdout 

    def execute_sudo_command(self, command):
        with self._ssh_client() as ssh_client:
            stdin, stdout, stderr = ssh_client.exec_command(f'sudo {command}', get_pty=True)
            stdin.write(self.docker_host_password+'\n')
            stdin.flush()
            logger.trace(stdout.read())
        return stdin, stdout, stderr
