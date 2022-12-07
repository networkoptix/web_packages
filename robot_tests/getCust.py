import codecs
import json
from robot.libraries.BuiltIn import BuiltIn

# default english and default customization
def get_variables(cust=BuiltIn().get_variable_value('${CUST}'), env=BuiltIn().get_variable_value('${ENVIRONMENT}')):
    if cust == "dw":
        env = f'https://digitalwatchdog.{env}.hdw.mx'
    elif cust == "hanwha":
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
        customization_variables = json.load(
                 customization_variables)
        # add the env variables
        customization_variables.update(env_json)
        all_variables = customization_variables

    return all_variables


if __name__ == "__main__":
    get_variables()