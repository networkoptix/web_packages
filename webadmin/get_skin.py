import json, sys, os

skins_path = os.path.abspath('../skins')
description_path = "src/customization/description.json"

with open(description_path) as description:
    customization_skin_name = json.load(description).get('skin')
    for name in os.listdir(skins_path):
        if name in customization_skin_name:
            print(name)
            sys.exit()
    print('blue')
