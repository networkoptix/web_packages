import os
import pystache
import sys


def check_templates():
    DIR = "../translations"
    templates_with_errors = []
    need_to_check = [DIR]
    limit = 1000
    while need_to_check and limit > 0:
        directory = need_to_check.pop(0)
        for resource in os.scandir(directory):
            if resource.is_dir():
                need_to_check.append(resource)
            elif 'mustache' in resource.path:
                with open(resource.path, 'r') as template_file:
                    try:
                        pystache.render(template_file.read())
                    except pystache.parser.ParsingError as e:
                        templates_with_errors.append([resource.path, e.__str__()])
        limit += -1

    if len(templates_with_errors) > 0:
        for template in templates_with_errors:
            file_path, error = template
            print(f"File path: {file_path}\tError: {error}")
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    check_templates()
