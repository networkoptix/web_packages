import json


def merge_two_json(x, y):
    z = x.copy()  # start with x's keys and values
    z.update(y)   # modifies z with y's keys and values & returns None

    return z


with open('app/language.json', 'r') as ajs_language:
    ajs_file = json.load(ajs_language)

with open('app/language_i18n.json', 'r') as auto_language:
    base_file = json.load(auto_language)

ajs_section = {"ajs": ajs_file}
i18n_section = {"i18n": base_file}

with open("./app/language_compiled.json", "w") as outfile:
    json.dump(merge_two_json(ajs_section, i18n_section), outfile, indent=4, sort_keys=True, separators=(',', ': '))
