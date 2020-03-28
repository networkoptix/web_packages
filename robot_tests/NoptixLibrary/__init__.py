#!/usr/bin/env python
# -*- coding: utf-8 -*-

import docker
import email.header
import imaplib
import os
import re
import time
import uuid
from datetime import date
from email.parser import HeaderParser
from platform import system
from random import *
from requests import head
from robot.libraries.BuiltIn import BuiltIn
from robot.api import logger

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException
from SeleniumLibrary.utils import (is_falsy, is_truthy, secs_to_timestr,
                                   timestr_to_secs)
from selenium.webdriver.support.color import Color
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.chrome.options import Options

class NoptixLibrary(object):

    def go_forward(self):
        """Simulates the user clicking the forward button on their browser."""
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        seleniumlib.driver.forward()

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
            
    def copy_text(self, locator):
        locator = self.convert_locator_to_webelement(locator)
        if self.get_os()=="MacOS":
            locator.send_keys(Keys.SHIFT, Keys.UP)
            locator.send_keys(Keys.CONTROL, Keys.INSERT)
        else:    
            locator.send_keys(Keys.CONTROL + 'a')
            locator.send_keys(Keys.CONTROL + 'c')

    def paste_text(self, locator):
        locator = self.convert_locator_to_webelement(locator)
        if self.get_os()=="MacOS":
            locator.send_keys(Keys.SHIFT, Keys.INSERT)
        else:    
            locator.send_keys(Keys.CONTROL + 'v')

    def delete_all_text(self, locator):
        locator = self.convert_locator_to_webelement(locator)
        if self.get_os()=="MacOS":
            locator.send_keys(Keys.SHIFT, Keys.UP)
            locator.send_keys(Keys.BACKSPACE)
        else:     
            locator.send_keys(Keys.CONTROL + 'a')
            locator.send_keys(Keys.BACKSPACE)

    def get_random_email(self, email):
        index = email.find('@')
        email = email[:index] + '+' + str(randint(1, 100)) + str(time.time()) + email[index:]
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

    def element_style_should_be(self, locator, styleAttribute, expectedValue):
        observedValue = self.get_element_style(locator, styleAttribute)
        if observedValue == expectedValue:
            pass
        else:
            raise AssertionError(f"Expected: {expectedValue}\nObserved: {observedValue}")

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

    def wait_until_element_has_style(self, locator, styleAttribute, expected, timeout=10):
        timeout = timeout + time.time()
        not_found = "No element found with style " + expected
        value = ""
        while time.time() < timeout:
            try:
                value = self.get_element_style(locator, styleAttribute)
                logger.debug(value)
                if value == expected:
                    return
            except Exception as e:
                print(e)
                not_found = f"{value} does not equal the expected {expected}"
            time.sleep(.2)
        raise AssertionError(not_found)

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

    def colors_are_same(self, color1, color2):
        return (Color.from_string(color1).rgba == Color.from_string(color2).rgba)

    def verify_button_arrow_direction(self, locator, expected, timeout=10):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        not_found = "No button arrow elements found"
        # expected is 'Up' or 'Down'
        expected = expected.strip().lower()
        logger.debug('expected: ' + expected)

        logger.debug('locator: ' + locator)

        navArrows = "//div[@class='nav-arrow']/span"
        logger.debug('navArrows: ' + navArrows)

        locators = locator+navArrows
        logger.debug('locators: ' + locators)

        # 'rotate(45deg)'
        pos = 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)'
        # 'rotate(-45deg)'
        neg = 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)'

        logger.debug('pos: '+pos)
        logger.debug('neg: '+neg)

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

    def get_browser_log(self):
        seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')
        return seleniumlib.driver.get_log('browser')

    def check_file_exists(self, url):
        linkInfo = head(url)
        if int(linkInfo.status_code) == 200: #and int(linkInfo.headers['Content-Length']) > 1000:
            return
        else:
            raise Exception("File does not appear to be available.")

    def check_in_list(self, expected, found):
        for url in expected:
            if found in url:
                return
            elif re.search(url, found):
                return
        raise Exception(found + " was not in the email.")

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

    def build_image(self, env):
        version = ""
        if env == "https://cloud-test.hdw.mx":
            version = "4.1.0.30618"
        elif env == "https://cloud-dev3.hdw.mx":
            version = "4.1.0.30027"
        elif env == "https://test4.cloud.hdw.mx":
            version = "4.1.0.30298"
        client = docker.from_env()
        return client.images.build(path=f"{os.getcwd()}/Docker",
                            tag="mergemediaserver",
                            buildargs={"mediaserver_deb":f"nxwitness-server-{version}-linux64-beta-test.deb"})

    def run_container(self, image, port, network):
        tmp = {'/run':'', '/run/lock':''}
        vol = {'/sys/fs/cgroup': {
                    'bind':'/sys/fs/cgroup',
                    'mode':'rw'}
                }
        prt = {7001:port}
        client = docker.from_env()
        cont = client.containers.run(image[0].id, detach=True, tmpfs=tmp, volumes=vol, ports=prt, network_mode=network, name=f"mergemediaserver{time.time()}")
        return cont

    def stop_containers(self, allContainers=True):
        client = docker.from_env()
        conts = client.containers.list()
        if allContainers:
            for cont in conts:
                if "mergemediaserver" in cont.name:
                    cont.stop()
        else:
            conts[0].stop()

    def prune_containers(self):
        client = docker.from_env()
        client.containers.prune()

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
        options.add_argument("--disable-gpu")
        #options.add_argument("--headless")
        options.add_experimental_option("prefs", {
            "profile.default_content_setting_values.notifications": 1
        })
        return options
    
    def push_notifications_swarm(self, slaves, users, ramp, seconds):
        txtFile = str(uuid.uuid1())    
        f= open(f"{txtFile}.txt","w+")
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
        f= open(f"{txtFile}.txt","w+")
        f.write("LOG OF RESPONSES\n\n")
        f.close()
        os.environ['LOCUSTTEXT'] = txtFile
        cmd = f"pabot --testlevelsplit --processes 10 --variable max:{max} --outputdir Load-Testing Load-Testing/push_notifications_pabot.robot"
#       print(cmd)
        os.system(cmd)
