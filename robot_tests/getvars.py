import codecs
import json
import re
from googletrans import Translator
from deepdiff import DeepDiff

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

    if lang != "en_US":
        # open the QA tran and replace with dev translations that match
        translation_variables = replaceMatches(lang)
        # open the QA translations and compare them to the modified dict and write the diff to a file
        with codecs.open("translations/variables_language_" + lang + ".json", encoding="utf-8") as translation_original:
            translation_original_json = json.load(translation_original)
            ddiff = DeepDiff(translation_original_json, translation_variables)
            with codecs.open("test_results/" + lang + "_substituted_for_dev.json", mode="w", encoding="utf-8") as outfile:
                json.dump(ddiff, outfile, ensure_ascii=False, indent=2)
                translation_variables = json.dumps(translation_variables)
    else:
        # open up the translation file we want and create a dictionary called translation_variables
        with codecs.open("translations/variables_language_" + lang + ".json", encoding="utf-8") as translation_variables:
            translation_variables = translation_variables.read()

    # open up the customization file we want and create a dictionary called customization_json
    with codecs.open("customizations/" + cust + ".json", encoding="utf-8") as customization_variables:
        customization_json = json.load(customization_variables)
        # for each key in customizaion_json find the key surrounded by % and replace it with that key's value
        for x in customization_json:
            p = re.compile('%' + x + '%')
            translation_variables = p.sub(
                customization_json[x], translation_variables)
        # # load the translation_variables into python
        translation_variables = json.loads(
            translation_variables)
        # add the LANGUAGE item to the dictionary with the value of lang
        translation_variables['LANGUAGE'] = lang
        # add the customization variables
        translation_variables.update(customization_json)
        translation_variables.update(env_json)
        all_variables = translation_variables
        return all_variables

def replaceMatches(lang):
    # This function helps language testing in the following ways:
    # If the DEV translations is different from a QA translation,
    # it is chosen over the QA translation as long as is actually
    # a translation and not in en_US. Any substituted translations
    # are written to /test_results/{lang}_substituted_for_dev.json. Any
    # dev translations found to have been left in en_US are written to
    # /test_results/{lang}_untranslated_in_dev.json. Bugs can be written
    # referencing the untranslated json to prompt dev to add more translations.

    # open the en_US QA translation file and turn into json dict
    with codecs.open("translations/variables_language_en_US.json", encoding="utf-8") as us_variables:
        us_variables_json = json.load(us_variables)
        # open lang QA translation file and turn into json dict
        with codecs.open("translations/variables_language_" + lang + ".json", encoding="utf-8") as translation_variables:
            translation_variables_json = json.load(translation_variables)
            # open lang DEV translation file and turn into json dict
            with codecs.open("../translations/" + lang + "/language_i18n.json", encoding="utf-8") as dev_translations:
                dev_translations_json = json.load(dev_translations)
                # open dev static translations files and add them to dev dict
                with codecs.open("../front_end/app/language_i18n_static.json", encoding="utf-8") as dev_static_keys:
                    dev_static_keys_json = json.load(dev_static_keys)
                    with codecs.open("../translations/" + lang + "/language_i18n_static.json", encoding="utf-8") as dev_static_values:
                        dev_static_values_json = json.load(dev_static_values)
                        list_dev_keys = list(NestedDictValues(dev_static_keys_json))
                        list_dev_values = list(NestedDictValues(dev_static_values_json))
                        for a in range(len(list_dev_keys)):
                            dev_translations_json.update({list_dev_keys[a]: list_dev_values[a]})
                        # replace any translation in QA that doesn't match the DEV translation
                        en_US_values = list(us_variables_json.values())
                        en_US_keys = list(us_variables_json.keys())
                        dev_values = list(dev_translations_json.values())
                        dev_keys = list(dev_translations_json.keys())
                        dev_untranslated = {}
                        for x in en_US_values:
                            for y in dev_keys:
                                if x == y:
                                    x = en_US_values.index(x)
                                    y = dev_keys.index(y)
                                    # if a dev translation is not already in QA, make sure its not in english and replace whats in qa
                                    if dev_values[y] not in translation_variables_json.values():
                                        detected_langs = str(Translator().detect(dev_values[y]))
                                        if "lang=en" in detected_langs:
                                            # if dev has it in english, write to a file
                                            dev_untranslated.update(
                                                {en_US_keys[x]: {dev_values[y]: translation_variables_json[en_US_keys[x]]}})
                                        else:
                                            # if in lang, substitute QA for Dev
                                            translation_variables_json.update({en_US_keys[x]: dev_values[y]})
                        with codecs.open("test_results/" + lang + "_untranslated_in_dev.json", mode="w",
                                         encoding="utf-8") as outfile:
                            json.dump(dev_untranslated, outfile, ensure_ascii=False, indent=2)
                            return translation_variables_json

def NestedDictValues(d):
    for v in d.values():
        if isinstance(v, dict):
            yield from NestedDictValues(v)
        else:
            if isinstance(v, str):
                yield v