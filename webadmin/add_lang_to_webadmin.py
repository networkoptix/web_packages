import json

description_path = "src/customization/description.json"
config_path = "src/customization/webadmin_config.json"


def adding_lang_to_webadmin_config():
    global config_path, description_path

    with open(description_path) as description_file:
        description = json.load(description_file)

    with open(config_path) as config_file:
        config = json.load(config_file)

    config["defaultLanguage"] = description.get("defaultLanguage", "en_US")
    config["supportedLanguages"] = description.get("customLanguages", ["en_US"])
    config["companyLink"] = description.get("contact", {}).get("companyUrl")
    config["companyName"] = description.get("companyName")
    config["trialLicenseKey"] = description.get("desktop", {}).get("trialLicenseKey")

    with open(config_path, 'w') as config_file:
        json.dump(config, config_file, indent=4,
                  sort_keys=True, separators=(',', ': '))


if __name__ == "__main__":
    adding_lang_to_webadmin_config()
