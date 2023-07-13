import json, re, os

class RobotVariables():
    def __init__(self, language: str) -> None:
        if language in ["en_US"]:
            self.language = language
    
    def lookup_translation_variables(self, variable_name):
        current_dir = os.path.abspath(os.getcwd())
        filename = "variables_language_en_US.json"
        file = os.path.join(current_dir, filename)
        with open(file, encoding="utf-8") as f:
            translation_variables = json.load(f)
            if variable_name in translation_variables:
                return translation_variables[variable_name]
        return None

    def lookup_account_variables(self, variable_name):
        current_dir = os.path.abspath(os.getcwd())
        filename = 'account_variables.json'
        file = os.path.join(current_dir, filename)        
        with open(file, encoding="utf-8") as f:
            account_variables = json.load(f)
            if variable_name in account_variables:
                return account_variables[variable_name]
        return None

    def lookup_variables_dict(self, variable_name):
        from variables_dict import variables_dict, variables
        if variable_name in variables_dict:
            return variables_dict[variable_name]

        if variable_name in variables:
            return variables[variable_name]
        return None

    def replace_nested_variables(self, value):
        # Regex pattern to find strings like {VARIABLE_NAME}
        pattern = r'{([A-Z_]+)}'
        matches = re.findall(pattern, value)
        for match in matches:
            replacement_value = self.__getattr__(match)
            value = value.replace('{' + match + '}', replacement_value)
        return value

    def __getattr__(self, variable_name):
        result = self.lookup_translation_variables(variable_name)
        if result is not None and type(result) is str:
            return self.replace_nested_variables(result)
        if result:
            return result   

        result = self.lookup_account_variables(variable_name)
        if result is not None and type(result) is str:
            return self.replace_nested_variables(result)
        if result:
            return result 

        result = self.lookup_variables_dict(variable_name)
        if result is not None and type(result) is str:
            return self.replace_nested_variables(result)
        elif result is not None:
            return result

        raise AttributeError(f"Variable {variable_name} not found in {self.language} or in variables_dict.py")

