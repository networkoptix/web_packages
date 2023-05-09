import json
import sys


def compare_licenses(update, ci):
    print(f"Comparing {update} with {ci}")
    with open(update, 'r') as f:
        update_licenses = json.load(f)
    with open(ci, 'r') as f:
        ci_licenses = json.load(f)
    errors = []
    for ci_pkg in ci_licenses:
        name = ci_pkg.get("Name")
        update_pkg = next(filter(lambda x: x["Name"] == name, update_licenses), None)
        if not update_pkg:
            ci_pkg.update(cause=f"MISSING in {update}")
            errors.append(ci_pkg)
            continue
        if ci_pkg["Name"] != update_pkg["Name"] \
                and ci_pkg["Version"] != update_pkg["Version"] \
                and ci_pkg["License"] != update_pkg["License"]:
            ci_pkg.update(cause=f"Information in {update} mismatches {ci}")
            errors.append(ci_pkg)
            continue
    if errors:
        for error in errors:
            print(f"License invalid for {error['Name']}-{error['Version']}. Cause: {error['cause']}.")
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    compare_licenses(sys.argv[1], sys.argv[2])
