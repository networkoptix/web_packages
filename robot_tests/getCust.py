import codecs
import json
from robot.libraries.BuiltIn import BuiltIn

# default english and default customization
def get_variables(cust=BuiltIn().get_variable_value('${CUST}')):

    # open up the customization file we want and create a dictionary called customization_json
    with codecs.open("customizations/" + cust + ".json", encoding="utf-8") as customization_variables:
        customization_variables = json.load(
                 customization_variables)
        all_variables = customization_variables
    return all_variables


if __name__ == "__main__":
    get_variables()