import json
import os
import re
from pathlib import Path

from variables_dict import variables
from variables_dict import variables_dict


class RobotVariables:

    def __init__(self, language: str) -> None:
        self.variables = {}
        self.warn_about_duplicates = False
        current_dir = Path(__file__).parent
        if language in ["en_US"]:
            self.language = language
            self.load_variables(current_dir / 'variables_language_en_US.json')
            self.load_variables(current_dir / 'account_variables.json')
            self.load_variables(current_dir / 'customizations' / 'default.json')

        # Load the variables from variables_dict.py
        self.variables.update(variables_dict)
        self.variables.update(variables)

    def load_variables(self, filepath):
        if not os.path.isfile(filepath):
            print(f"File {filepath} not found.")
            return
        with open(filepath, encoding="utf-8") as f:
            json_data = json.load(f)
            transformed_data = {k.replace(" ", "_"): v for k, v in json_data.items()}
            for k, v in transformed_data.items():
                if k in self.variables and self.warn_about_duplicates:
                    print(f'Warning: Key "{k}" in {filepath} is not unique. Overwriting value.')
                self.variables[k] = v

    def lookup_variables_dict(self, variable_name):
        if variable_name in variables_dict:
            return variables_dict[variable_name]
        if variable_name in variables:
            return variables[variable_name]
        return None

    def replace_nested_variables(self, value):
        # Regex pattern to find strings like {VARIABLE_NAME} or %VARIABLE_NAME%
        patterns = [r'{([A-Z_]+)}', r'%([A-Z_]+)%']
        for pattern in patterns:
            matches = re.findall(pattern, value)
            for match in matches:
                replacement_value = self.__getattr__(match)
                # Replace the matched string with the replacement value
                value = value.replace('{' + match + '}' if '{' in pattern else '%' + match + '%', replacement_value)
        return value

    def __getattr__(self, variable_name, get_replacements=True):
        if get_replacements:
            if variable_name not in self.variables:
                raise AttributeError(f"Variable {variable_name} not found in {self.language} or in variables_dict.py")
            result = self.variables[variable_name]
            if isinstance(result, str):
                return self.replace_nested_variables(result)
            return result
        return self.variables[variable_name]
