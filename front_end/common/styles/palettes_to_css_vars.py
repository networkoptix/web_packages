"""A script to generate CSS variables from theme palettes.

Currently limited to light/dark colors.

Run in app/styles.
"""

import re

from pathlib import Path

VAR_NAME_RE_STR = r"[\w\-]+"
LINE_REGEX = re.compile(
    fr"^ *\$(?P<name>{VAR_NAME_RE_STR})\s*:\s*(?P<value>.+)\s*;", re.M
)
LIGHT_DARK_VALUE_REGEX = re.compile(r"\$[\w\-]*?(light|dark)\d+")

def is_light_dark_var(name: str, value: str) -> bool:
    return (
        "light" in name
        or "dark" in name
        or LIGHT_DARK_VALUE_REGEX.match(value)
    )

def main():
    palette_files = [
        Path("./native-theme/_theme_palette.scss"),
        Path("./_theme_palette.scss")
    ]
    palette_vars = [
        dict(
            match.groups()
            for match in LINE_REGEX.finditer(
                palette.read_text(encoding="utf-8")
            )
        )
        for palette in palette_files
    ]
    for i, vars in enumerate(palette_vars):
        palette_vars[i] = {
            k: v for k, v in vars.items()
            if not any(k in next_vars for next_vars in palette_vars[i+1:])
        }
        # Don't generate CSS variable if it's going to be overridden
        # Ordering in palette_files should match import order
        # in app.component.scss


    for file, vars in zip(palette_files, palette_vars):
        output_file = Path("./css-variables", file)
        if not output_file.parent.exists():
            output_file.parent.mkdir(parents=True)

        with output_file.open("w", encoding="utf-8", newline="\n") as f:
            uplevels = "../" * len(file.parts)
            f.write(f"@use \"{uplevels}utils\" as *;\n")
            f.write(f"@use \"{uplevels}{'/'.join(file.parts)}\" as *;\n\n")
            f.write(":root {\n")
            for name, value in vars.items():
                if "brand" in name:
                    continue

                if is_light_dark_var(name, value):
                    f.write(
                        f"\t@include generateVarAndRgb(--{name}, ${name});\n"
                    )
                    # f.write(f"\t--{name}: #{{${name}}};\n")
                    # f.write(f"\t--{name}--rgb: #{{hex2Rgb(${name})}};\n")
            f.write("}\n")

if __name__ == "__main__":
    main()
