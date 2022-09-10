"""A script to generate CSS variables for app Sass variables.

Currently limited to light/dark colors from the theme palettes.

Run in app/styles.
"""

import re

from pathlib import Path
from typing import List

VAR_NAME_RE_STR = r"[\w\-]+"
LINE_REGEX = re.compile(
    fr"^ *(?P<name>\${VAR_NAME_RE_STR})\s*:\s*(?P<value>.+)\s*;", re.M
)
LIGHT_DARK_VALUE_REGEX = re.compile(r"\$[\w\-]*?(light|dark)\d+")

def main():
    source_files = [
        "./_theme_variables_common.scss",
        # "./_pages_variables.scss"
    ]

    for file in source_files:
        source_path = Path(file)

        source_vars: List[str] = []
        line_matches = dict(
            match.groups() for match in LINE_REGEX.finditer(
                source_path.read_text(encoding="utf-8")
            )
        )
        for name, value in line_matches.items():
            if value in line_matches:
                original = value
                while original in line_matches:
                    original = line_matches[original]
                    # Follow up to original value

                if LIGHT_DARK_VALUE_REGEX.match(original):
                    source_vars.append(name)
            elif LIGHT_DARK_VALUE_REGEX.match(value):
                source_vars.append(name)

        output_file = Path("./css-variables", source_path)
        with output_file.open("w", encoding="utf-8", newline="\n") as f:
            f.write(f"@use \"../utils\" as *;\n")
            f.write(f"@use \"../{source_path.name}\" as *;\n\n")
            # Assuming variable files to be in app/styles
            f.write(":root {\n")
            for name in source_vars:
                f.write(f"\t@include generateVarAndRgb(--{name[1:]}, {name});\n")
            f.write("}\n")

if __name__ == "__main__":
    main()
