import codecs
import json
from deepdiff import DeepDiff
from googletrans import Translator

class matchTranslations:

    def replaceMatches(lang):
        # open the en_US QA translation file and turn into json dict
        with codecs.open("translations/variables_language_en_US.json", encoding="utf-8") as us_variables:
            us_variables_json = json.load(us_variables)
            # open lang QA translation file and turn into json dict
            with codecs.open("translations/variables_language_" + lang + ".json", encoding="utf-8") as translation_variables:
                translation_variables_json = json.load(translation_variables)
                # open lang DEV translation file and turn into json dict
                with codecs.open("../translations/" + lang + "/language_i18n.json", encoding="utf-8") as dev_translations:
                    dev_translations_json = json.load(dev_translations)
                    # replace any translation in QA that doesn't match the DEV translation
                    us_values = list(us_variables_json.values())
                    us_keys = list(us_variables_json.keys())
                    dev_values = list(dev_translations_json.values())
                    dev_keys = list(dev_translations_json.keys())
                    dev_untranslated = {}
                    for x in us_values:
                        for y in dev_keys:
                            if x == y:
                                x = us_values.index(x)
                                y = dev_keys.index(y)
                                # if a dev translation is not already in QA, make sure its not in english and replace whats in qa
                                if dev_values[y] not in translation_variables_json.values():
                                    detected_langs = str(Translator().detect(dev_values[y]))
                                    if "lang=en" in detected_langs:
                                        # if dev has it in english, write to a file
                                        dev_untranslated.update({us_keys[x]: {dev_values[y]: translation_variables_json[us_keys[x]]}})
                                    else:
                                        # if in lang, substite QA for Dev
                                        translation_variables_json.update({us_keys[x]: dev_values[y]})
                    with codecs.open("test_results/" + lang + "_untranslated_in_dev.json", mode="w", encoding="utf-8") as outfile:
                        json.dump(dev_untranslated, outfile, ensure_ascii=False, indent=2)
                    return translation_variables_json

    if __name__ == "__main__":
        lang = "ko_KR"
        variables = replaceMatches(lang)
        with codecs.open("translations/variables_language_" + lang + ".json",
                         encoding="utf-8") as translation_variables:
            translation_variables_json = json.load(translation_variables)
            ddiff = DeepDiff(translation_variables_json, variables)
            with codecs.open("test_results/" + lang + "_substituted_for_dev.json", mode="w", encoding="utf-8") as outfile:
                json.dump(ddiff, outfile, ensure_ascii=False, indent=2)




