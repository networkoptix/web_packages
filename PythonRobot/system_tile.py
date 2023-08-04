import time

import selenium.common.exceptions

import robot_keywords
from page_text import PageText
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables
from variables import ENV


class SystemTile:
    def __init__(self, driver, tile_element, lang="en_US"):
        self.driver = driver
        self.selenium_element = tile_element
        self.rb = RobotVariables(lang)

    def get_title(self):
        return self.selenium_element.find_element_by_xpath(".//nx-search-highlight").text

    def get_owner(self):
        return self.selenium_element.find_element_by_xpath(".//span[contains(@class, 'user-name')]").text

    def online(self):
        try:
            self.selenium_element.find_element_by_xpath(".//button")
            return True
        except selenium.common.exceptions.NoSuchElementException:
            return False