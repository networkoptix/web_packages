from io import StringIO

import pytest

from partners.management.commands.aggregate_change_log import Command


VALID_FILE = """
# Changes in something


## Changes

- Something changed
- Something else changed

### Bug Fixes
- Fixed a bug
- Fixed another bug"""

EMPTY_FILE = ""


FILE_WITHOUT_WHITESPACES = """

blabla


"""


EMPTY_CHANGES = """

# Changes in something

## Changes


"""


class TestAggregateChangeLog:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path):
        self.cmd = Command()
        self.buf = StringIO()

    def test_valid_file_adding(self, mocker):
        mocked_open = mocker.patch("builtins.open", mocker.mock_open(read_data=VALID_FILE))
        self.cmd.write_from_versioned_file(self.buf, "v3")
        result = self.buf.getvalue()
        assert "# Changes" not in result
        assert result.startswith("\n## v3\n\n")
        assert '- Something changed' in result
        assert '- Something else changed' in result
        assert '- Fixed a bug' in result
        assert '- Fixed another bug' in result
        assert '### Bug Fixes' in result
        assert result.endswith("\n")

    @pytest.mark.parametrize("file_content", [FILE_WITHOUT_WHITESPACES, EMPTY_FILE, EMPTY_CHANGES])
    def test_no_changes(self, file_content, mocker):
        mocked_open = mocker.patch("builtins.open", mocker.mock_open(read_data=file_content))
        self.cmd.write_from_versioned_file(self.buf, "v3")
        result = self.buf.getvalue()
        assert result == "\n## v3\n\nNo changes\n"

    def test_file_not_found(self, mocker):
        mocked_open = mocker.patch("builtins.open", side_effect=FileNotFoundError)
        self.cmd.write_from_versioned_file(self.buf, "v3")
        result = self.buf.getvalue()
        assert result == "\n## v3\n\nNo changes\n"




