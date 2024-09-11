import os
import sys
from io import StringIO

from django.conf import settings
from django.core.management import BaseCommand


CHANGELOG_DIR = os.path.join(settings.BASE_DIR, "partners/changelogs")
CHANGELOG_ALL = os.path.join(settings.STATIC_ROOT, "CHANGELOG_ALL.md")


class Command(BaseCommand):
    help = "Aggregates versions changelog files to a single file"

    def handle(self, *args, **options):
        with open(CHANGELOG_ALL, 'w') as f:
            f.write("# Changes\n")
            for version in settings.AVAILABLE_VERSIONS:
                self.write_from_versioned_file(f, version)

        self.stdout.write(self.style.SUCCESS("Done!"))

    def write_from_versioned_file(self, f, version):
        # Adding new line between versions
        f.write("\n")
        f.write(f"## {version}\n\n")
        has_content = False
        buf = StringIO()
        try:
            with open(os.path.join(CHANGELOG_DIR, f"CHANGELOG_{version.upper()}.md")) as version_file:
                while line := version_file.readline():
                    # Skip everything before the changes section
                    if line.startswith("## Changes"):
                        break
                needs_new_line = True
                while line := version_file.readline():
                    buf.write(line)
                    if not has_content and line.rstrip():
                        has_content = True
                    if line.endswith("\n"):
                        needs_new_line = False
                    else:
                        needs_new_line = True

            if not has_content:
                # If the file doesn't have a changes section, write "No changes" to the file
                f.write("No changes\n")
            else:
                buf.seek(0)
                f.write(buf.read())
                if needs_new_line:
                    # Add a new line if the file doesn't end with one
                    f.write("\n")
        except FileNotFoundError as e:
            # If the file doesn't exist, write "No changes" to the file
            f.write("No changes\n")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading file {version}.md"))
            self.stdout.write(self.style.ERROR(str(e)))
            f.flush()
            sys.exit(1)
