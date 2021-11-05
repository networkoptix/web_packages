"""A script to find unused theme variables.

Run in app/styles.

Important: Does not check inside _theme_variables.scss, so a variable only
used inside _theme_variables.scss will not be detected for app usage.

Example:
$foo = red; <= only used inside, will be incorrectly reported as unused in app
$bar = $foo; <= used outside, will be correctly reported as used in app
"""

import re

from pathlib import Path

def main():
    text = Path("./_theme_variables.scss").read_text(encoding="utf-8")
    theme_vars = dict.fromkeys(
        match.group(1) for match in re.finditer(r"^\$([\w\-]+)", text, re.M)
    )
    # Preserve ordering
    for tvar in theme_vars:
        theme_vars[tvar] = {
            "app": False,
            "bootstrap": False
        }

    FILE_VAR_REGEX = re.compile(r"(?:\$|(?:--))([\w\-]+)")

    app_sass_files = Path("../").rglob("*.scss")
    for file in app_sass_files:
        if file.name == "_theme_variables.scss":
            continue
        contents = file.read_text(encoding="utf-8")
        file_vars = set(
            var.group(1) for var in FILE_VAR_REGEX.finditer(contents)
        )
        for tvar in theme_vars:
            if tvar in file_vars:
                theme_vars[tvar]["app"] = True

    bootstrap_files = Path("../../node_modules/bootstrap").rglob("*.scss")
    for file in bootstrap_files:
        contents = file.read_text(encoding="utf-8")
        file_vars = set(
            var.group(1) for var in FILE_VAR_REGEX.finditer(contents)
        )
        for tvar in theme_vars:
            if tvar in file_vars:
                theme_vars[tvar]["bootstrap"] = True

    both = []
    app_only = []
    bootstrap_only = []
    neither = []

    for name, usage in theme_vars.items():
        if usage["app"] and usage["bootstrap"]:
            both.append(name)
        elif usage["app"] and not usage["bootstrap"]:
            app_only.append(name)
        elif not usage["app"] and usage["bootstrap"]:
            bootstrap_only.append(name)
        elif not usage["app"] and not usage["bootstrap"]:
            neither.append(name)

    print("-- BOTH --", *both, sep="\n")
    print("\n-- APP ONLY --", *app_only, sep="\n")
    print("\n-- BOOTSTRAP ONLY --", *bootstrap_only, sep="\n")
    print("\n-- NEITHER --", *neither, sep="\n")

if __name__ == "__main__":
    main()
