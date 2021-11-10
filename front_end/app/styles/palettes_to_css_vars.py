"""A script to generate CSS variables from theme palettes.

Run in app/styles.
"""

import re

from pathlib import Path

def main():
    palette_files = [
        Path("./native-theme/_theme_palette.scss"),
        Path("./_theme_palette.scss")
    ]

    var_name_regex = re.compile(fr"^ *\$([\w\-]+)")

    for palette in palette_files:
        css_vars = [
            line for line in palette.read_text().splitlines()
            if not line or var_name_regex.match(line)
        ]

        output_file = Path("./css-variables", palette)
        if not output_file.parent.exists():
            output_file.parent.mkdir(parents=True)

        with output_file.open("w", encoding="utf-8", newline="\n") as f:
            uplevels = "../" * len(palette.parts)
            f.write(f"@use \"{uplevels}utils\" as *;\n")
            f.write(f"@use \"{uplevels}{'/'.join(palette.parts)}\" as *;\n\n")
            f.write(":root {\n")
            for var in css_vars:
                if "brand" in var:
                    continue

                if var:
                    name = var_name_regex.match(var).group(1)
                    f.write(
                        f"\t@include generateVarAndRgb(--{name}, ${name});\n"
                    )
                    # f.write(f"\t--{name}: #{{${name}}};\n")
                    # f.write(f"\t--{name}--rgb: #{{hex2Rgb(${name})}};\n")
                else:
                    f.write("\n")
            f.write("}\n")

if __name__ == "__main__":
    main()
