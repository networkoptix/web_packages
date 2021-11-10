"""A script to replace Sass variables with CSS variables.

Run in app/styles.

Either pass in target directories on the command line
or change TARGET_DIRS below to point at the target directories.

TARGET_DIRS is currently the folders that have been converted to
CSS variables for colors.

Example: $dark9 => var(--dark9)

VERIFY ALL REPLACEMENTS AND CHECK FOR COMPILATION ERRORS BEFORE COMMITTING.
"""

import itertools
import re
import sys

from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Generator, Dict, Callable, Union, List

TARGET_DIRS: List[Path] = [
    "../src/pages/account",
    "../src/pages/download",
    "../src/pages/download-history",
    "../src/pages/ipvd",
    "../src/pages/integration",
    "../src/pages/health",
    "../src/pages/systems"
]
# Point this to your target directories

VAR_NAME_RE_STR = r"[\w\-]+"
CSS_VAR_NAME_REGEX =  re.compile(fr"--({VAR_NAME_RE_STR})")

def get_var_names(file: Path) -> Generator[str, None, None]:
    return (
        match.group(1) for match in CSS_VAR_NAME_REGEX.finditer(
            file.read_text(encoding="utf-8")
        )
    )

def main():
    global TARGET_DIRS
    if len(sys.argv) > 1:
        TARGET_DIRS = [Path(dir_) for dir_ in sys.argv[1:]]
    elif TARGET_DIRS:
        TARGET_DIRS = [Path(dir_) for dir_ in TARGET_DIRS]
    else:
        raise SystemExit("Error: No target directories specified")

    target_vars = set([
        *itertools.chain.from_iterable(
            get_var_names(file)
            for file in Path("./css-variables").rglob("*.scss")
        ),
        *CSS_VAR_NAME_REGEX.findall(
            Path("./skin.css").read_text(encoding="utf-8")
        )
    ])

    class TargetVarMatch(Enum):
        FULL_MATCH = 1
        TO_DASH = 2
        TO_UNDERSCORE = 3
        NO_MATCH = 4

    def is_target_var(var_name: str) -> TargetVarMatch:
        if var_name in target_vars:
            return TargetVarMatch.FULL_MATCH
        elif var_name.replace("_", "-") in target_vars:
            return TargetVarMatch.TO_DASH
        elif var_name.replace("-", "_") in target_vars:
            return TargetVarMatch.TO_UNDERSCORE
        else:
            return TargetVarMatch.NO_MATCH
        # Sass treats underscore and dash as interchangable
        # Note: will not catch source variables that use both

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

    groupdict_type = Dict[str, Union[str, None]]

    def rgba_sub_func(groupdict: groupdict_type) -> str:
        css_var = f"var(--{groupdict['var_name']}--rgb)"
        alpha = groupdict["args"]
        return f"rgba({css_var}, {alpha})"

    def transparentize_sub_func(groupdict: groupdict_type) -> str:
        css_var = f"var(--{groupdict['var_name']}--rgb)"
        alpha = 1 - Decimal(groupdict["args"])
        # Assuming that variable color is 100% opaque
        return f"rgba({css_var}, {alpha})"

    sass_funcs: Dict[str, Callable[[groupdict_type], str]] = {
        "rgba": rgba_sub_func,
        "transparentize": transparentize_sub_func
    }
    def var_sub_re_func(match: re.Match) -> str:
        groupdict: groupdict_type = match.groupdict()
        target_match = is_target_var(groupdict["var_name"])

        if target_match == TargetVarMatch.NO_MATCH:
            return match.group(0)
        elif target_match == TargetVarMatch.TO_DASH:
            groupdict["var_name"] = groupdict["var_name"].replace("_", "-")
        elif target_match == TargetVarMatch.TO_UNDERSCORE:
            groupdict["var_name"] = groupdict["var_name"].replace("-", "_")

        if groupdict["func_name"]:
            try:
                return sass_funcs[groupdict["func_name"]](groupdict)
            except KeyError:
                return match.group(0)
                # Have not encountered this function yet
        else:
            return f"var(--{groupdict['var_name']})"

    remainders_regex = re.compile(fr"\$({VAR_NAME_RE_STR})")

    for target_dir in TARGET_DIRS:
        for file in target_dir.rglob("*.scss"):
            contents = file.read_text(encoding="utf-8")

            contents = var_sub_regex.sub(var_sub_re_func, contents)

            # Remaining variables that have not been replaced
            remainders = [
                match.group(1) for match in remainders_regex.finditer(contents)
                if is_target_var(match.group(1)) != TargetVarMatch.NO_MATCH
            ]
            if remainders:
                print(file.name)
                print(remainders)
                print("")

            with file.open("w", encoding="utf-8", newline="\n") as f:
                f.write(contents)

if __name__ == "__main__":
    main()
