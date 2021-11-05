"""A script to replace Sass variables with CSS variables.

Run in app/styles.

Either pass in a target directory on the command line
or change TARGET_DIR below to point at the target directory.

Example: $dark9 => var(--dark9)

VERIFY ALL REPLACEMENTS AND CHECK FOR COMPILATION ERRORS BEFORE COMMITTING.
"""

import itertools
import re
import sys

from decimal import Decimal
from pathlib import Path
from typing import Generator, Dict, Callable

TARGET_DIR = Path("../src/pages/ipvd")
# Point this to your target directory

VAR_NAME_RE_STR = r"[\w\-]+"
CSS_VAR_NAME_REGEX =  re.compile(fr"--({VAR_NAME_RE_STR})")

def get_var_names(file: Path) -> Generator[str, None, None]:
    return (
        match.group(1) for match in CSS_VAR_NAME_REGEX.finditer(
            file.read_text(encoding="utf-8")
        )
    )

def main():
    global TARGET_DIR
    try:
        TARGET_DIR = Path(sys.argv[1])
    except IndexError:
        pass

    target_vars = set(
        itertools.chain.from_iterable(
            get_var_names(file)
            for file in Path("./css-variables").rglob("*.scss")
        )
    )

    def is_target_var(var_name: str) -> bool:
        return (
            var_name in target_vars
            or var_name.replace("_", "-") in target_vars
            # Sass treats underscore and dash as interchangable
            # Note: will not catch mixed use
        )

    var_func_pre_str = fr"(?P<func_open>(?P<func_name>[a-z]+)\()?"
    # Check if used in Sass function

    var_name_re_str = (
        fr"(?:{VAR_NAME_RE_STR}\.)?\$(?P<var_name>{VAR_NAME_RE_STR})"
    )
    # Check for Sass variable (possibly as named import)

    var_func_post_str = r"(?(func_open)(?P<func_close>\s*,\s*(?P<args>.+)\)))"
    # Check for args if function opener matched

    var_sub_regex = re.compile(
        fr"{var_func_pre_str}{var_name_re_str}{var_func_post_str}"
    )

    def rgba_sub_func(match: re.Match) -> str:
        css_var = f"var(--{match.group('var_name')}--rgb)"
        alpha = match.group('args')
        return f"rgba({css_var}, {alpha})"

    def transparentize_sub_func(match: re.Match) -> str:
        css_var = f"var(--{match.group('var_name')}--rgb)"
        alpha = 1 - Decimal(match.group('args'))
        # Assuming that variable color is 100% opaque
        return f"rgba({css_var}, {alpha})"

    sass_funcs: Dict[str, Callable[[re.Match], str]] = {
        "rgba": rgba_sub_func,
        "transparentize": transparentize_sub_func
    }
    def var_sub_re_func(match: re.Match) -> str:
        if is_target_var(match.group("var_name")):
            if match.group("func_name"):
                try:
                    return sass_funcs[match.group("func_name")](match)
                except KeyError:
                    return match.group(0)
                    # Have not encountered this function yet
            else:
                return f"var(--{match.group('var_name')})"
        else:
            return match.group(0)

    remainders_regex = re.compile(fr"\$({VAR_NAME_RE_STR})")

    for file in TARGET_DIR.rglob("*.scss"):
        contents = file.read_text(encoding="utf-8")

        contents = var_sub_regex.sub(var_sub_re_func, contents)

        # Remaining variables that have not been replaced
        remainders = [
            match.group(1) for match in remainders_regex.finditer(contents)
            if is_target_var(match.group(1))
        ]
        if remainders:
            print(file.name)
            print(remainders)
            print("")

        with file.open("w", encoding="utf-8", newline="\n") as f:
            f.write(contents)

if __name__ == "__main__":
    main()
