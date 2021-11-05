"""A script to generate CSS variables for theme variables.

Run in app/styles.
"""

import itertools
import re

from pathlib import Path
from typing import Dict, List

VAR_NAME_RE_STR = r"[\w\-]+"
SASS_VAR_REGEX = re.compile(fr"^\${VAR_NAME_RE_STR}", re.M)
LINE_REGEX = re.compile(
    fr"(?P<name>{VAR_NAME_RE_STR})\s*:\s*(?P<value>.+)\s*;"
)
CSS_VAR_REGEX = re.compile(fr"var\(--.+\)")
HEX_REGEX = re.compile(r"#[a-zA-Z0-9]+")

def get_sass_vars(filepath: str) -> List[str]:
    """Find all variables defined in a Sass file.

    Includes leading $ in variable names.
    """
    return SASS_VAR_REGEX.findall(Path(filepath).read_text(encoding="utf-8"))

def main():
    palette_files = [
        "./_theme_palette.scss",
        "./native-theme/_theme_palette.scss",
        # "./custom/_custom_palette.scss"
    ]
    palette_vars = set(
        itertools.chain.from_iterable(
            get_sass_vars(file) for file in palette_files
        )
    )

    theme_vars: Dict[str, str] = {}
    theme_vars_file = Path("./_theme_variables.scss")
    for line in theme_vars_file.read_text().splitlines():
        if not SASS_VAR_REGEX.match(line):
            continue

        try:
            name, value = LINE_REGEX.search(line).groups()
        except AttributeError:
            continue

        # Only capture colors, ignore everything else
        if (
            value in palette_vars # palette variable
            or value in theme_vars # theme variable
            or CSS_VAR_REGEX.fullmatch(value) # CSS variable
            or HEX_REGEX.match(value) # hex value
            or value == "transparent"
            or any(var in value for var in palette_vars)
            # palette variable with modification
            # e.g. $light16 !default
            or any(var in value for var in theme_vars)
            # theme variable with modification
        ):
            theme_vars[name] = value

    css_var_value_regex = re.compile(fr"--({VAR_NAME_RE_STR})")

    output_file = Path("./css-variables", theme_vars_file)
    with output_file.open("w", encoding="utf-8", newline="\n") as f:
        f.write(f"@use \"../utils\" as *;\n")
        f.write(f"@use \"../_theme_variables.scss\" as *;\n\n")
        f.write(":root {\n")
        for name, value in theme_vars.items():
            if value.startswith("var"):
                value = css_var_value_regex.search(value).group(1)
                # Replace CSS variables with source Sass variables
            elif value in theme_vars:
                original = value
                while original in theme_vars:
                    original = theme_vars[original]
                    # Follow up to original value

                if original.startswith("var"):
                    value = css_var_value_regex.search(value).group(1)
                else:
                    value = name
            else:
                value = name
            f.write(f"\t@include generateVarAndRgb(--{name}, ${value});\n")
        f.write("}\n")

if __name__ == "__main__":
    main()
