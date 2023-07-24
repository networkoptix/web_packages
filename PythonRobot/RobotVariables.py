import json, re, os, glob

class RobotVariables():
    def __init__(self, language: str) -> None:
        self.warn_about_duplicates = False
        self.variables = {}
        self.current_dir = os.path.abspath(os.getcwd())
        if language in ["en_US"]:
            self.language = language
            # Join the current directory path with the relative file path
            self.load_variables(os.path.join(self.current_dir, 'variables_language_en_US.json'))
            self.load_variables(os.path.join(self.current_dir, 'account_variables.json'))

        # Filepaths will take directories and find the json files in them
        # it will also take single json files
        filepaths = [os.path.join(self.current_dir, 'robot_tests/customizations/default.json')]
        for filepath in filepaths:
            if os.path.isdir(filepath):
                self.load_variables_from_dir(filepath)
            else:
                self.load_variables(filepath)

    def load_variables(self, filepath):
        if not os.path.isfile(filepath):
            print(f"File {filepath} not found.")
            return
        with open(filepath, encoding="utf-8") as f:
            json_data = json.load(f)
            transformed_data = {k.replace(" ", "_"): v for k, v in json_data.items()}
            for k, v in transformed_data.items(): 
                if self.warn_about_duplicates:
                    if k in self.variables:
                        print(f'Warning: Key "{k}" in {filepath} is not unique. Overwriting value.')
                self.variables[k] = v

    def load_variables_from_dir(self, directory):
        for file in glob.glob(os.path.join(directory, '*.json')):
            self.load_variables(file)

    def __getattr__(self, variable_name):
        if variable_name not in self.variables:
            raise AttributeError(f"Variable {variable_name} not found in {self.language} or in variables_dict.py")
        result = self.variables[variable_name]
        if isinstance(result, str):
            return self.replace_nested_variables(result)
        return result

    def replace_nested_variables(self, value):
        # Regex pattern to find strings like {VARIABLE_NAME}
        pattern = r'{([A-Z_]+)}'
        matches = re.findall(pattern, value)
        for match in matches:
            replacement_value = self.__getattr__(match)
            value = value.replace('{' + match + '}', replacement_value)
        return value
