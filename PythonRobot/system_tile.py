import time

import selenium.common.exceptions

import robot_keywords
from page_text import PageText
from text_field import TextField
from button import Button
from RobotVariables import RobotVariables
from variables import ENV
from generic_element import Element


class SystemTile:
    def __init__(self, driver, tile_element, lang="en_US"):
        self.driver = driver
        self.selenium_element = tile_element
        self.rb = RobotVariables(lang)

    def title(self):
        return self.selenium_element.find_element_by_xpath(".//nx-search-highlight/span")

    def get_owner(self):
        xpath = self.selenium_element.find_element_by_xpath(".//span[contains(@class, 'user-name')]")
        return Element(self.driver, xpath)

    def online(self):
        try:
            self.selenium_element.find_element_by_xpath(".//button")
            return True
        except selenium.common.exceptions.NoSuchElementException:
            return False