import codecs
import json
import re
from robot.libraries.BuiltIn import BuiltIn

# default english and default customization
def get_variables(cust=BuiltIn().get_variable_value('${CUST}')):

    # open up the customization file we want and create a dictionary called customization_json
    with codecs.open("customizations/" + cust + ".json", encoding="utf-8") as customization_variables:
        customization_dict = json.load(customization_variables)
        for x in customization_dict:
            p = re.compile('%ENV%')
            customization_dict[x] = p.sub(BuiltIn().get_variable_value('${ENV}'), customization_dict[x])
    return customization_dict

if __name__ == "__main__":
    get_variables()