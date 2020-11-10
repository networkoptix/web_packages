#!/usr/bin/env python
import os
import sys
import argparse

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloud.settings")

    argv = sys.argv
    cmd = argv[1] if len(argv) > 1 else None
    if cmd in ['test']:
        parser = argparse.ArgumentParser(add_help=False)
        parser.add_argument('-tld', '--test-live-db', action='store_true')
        args, argv = parser.parse_known_args(argv)

    from django.core.management import execute_from_command_line

    execute_from_command_line(argv)
