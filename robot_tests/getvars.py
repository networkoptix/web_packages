import codecs
import json
import re


# default english and default customization
def get_variables(cust="default", lang="en_US", env="cloud-test"):
    if cust == "dw" or cust == "hanwha":
        env = f'https://{cust}.{env}.hdw.mx'
    elif cust == "localhost":
        env = 'https://localhost:9000'
    elif cust != "default":
        env = f'https://{cust}.cloud.hdw.mx'
    else:
        env = f'https://{env}.hdw.mx'

    env_json = {"ENV": env}

    # open up the customization file we want and create a dictionary called customization_json
    with codecs.open("customizations/" + cust + ".json", encoding="utf-8") as customization_variables:
        customization_json = json.load(customization_variables)
        # open up the translation file we want and create a dictionary called translation_variables
        with codecs.open("translations/variables_language_" + lang + ".json", encoding="utf-8") as translation_variables:
            translation_variables = translation_variables.read()

            # for each key in customizaion_json find the key surrounded by % and replace it with that key's value
            for x in customization_json:
                p = re.compile('%' + x + '%')
                translation_variables = p.sub(
                    customization_json[x], translation_variables)
            # load the translation_variables into python
            translation_variables = json.loads(
                translation_variables)
            # add the LANGUAGE item to the dictionary with the value of lang
            translation_variables['LANGUAGE'] = lang
            # add the customization variables
            translation_variables.update(customization_json)
            translation_variables.update(env_json)
            all_variables = translation_variables
            return all_variables
