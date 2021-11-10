"""A script to generate CSS variables for app Sass variables.

Run in app/styles.
"""

import itertools
import re

from pathlib import Path
from typing import Dict, List

VAR_NAME_RE_STR = r"[\w\-]+"
SASS_VAR_REGEX = re.compile(fr"^ *\${VAR_NAME_RE_STR}", re.M)
SKIN_VAR_REGEX = re.compile(fr"^ *--({VAR_NAME_RE_STR}):", re.M)
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
        "./native-theme/_theme_palette.scss",
        "./_theme_palette.scss"
    ]
    palette_vars = set(
        itertools.chain.from_iterable(
            get_sass_vars(file) for file in palette_files
        )
    )

    source_files = [
        "./_theme_variables.scss",
        # "./_pages_variables.scss"
    ]

    for file in source_files:
        source_path = Path(file)

        source_vars: Dict[str, str] = {}
        for line in source_path.read_text().splitlines():
            if not SASS_VAR_REGEX.match(line):
                continue

            try:
                name, value = LINE_REGEX.search(line).groups()
            except AttributeError:
                continue

            # Only capture colors, ignore everything else
            if (
                value in palette_vars # palette variable
                or value in source_vars # source variable
                or CSS_VAR_REGEX.fullmatch(value) # CSS variable
                or HEX_REGEX.match(value) # hex value
                or value == "transparent"
                or any(var in value for var in palette_vars)
                # palette variable with modification
                # e.g. $light16 !default
                or any(var in value for var in source_vars)
                # source variable with modification
            ):
                source_vars[name] = value

        css_var_value_regex = re.compile(fr"--({VAR_NAME_RE_STR})")

        output_file = Path("./css-variables", source_path)
        with output_file.open("w", encoding="utf-8", newline="\n") as f:
            f.write(f"@use \"../utils\" as *;\n")
            f.write(f"@use \"../{source_path.name}\" as *;\n\n")
            # Assuming variable files to be in app/styles
            f.write(":root {\n")
            for name, value in source_vars.items():
                if value.startswith("var"):
                    value = css_var_value_regex.search(value).group(1)
                    # Replace CSS variables with source Sass variables
                elif value in source_vars:
                    original = value
                    while original in source_vars:
                        original = source_vars[original]
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
