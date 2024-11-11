import argparse
import sys
from pathlib import Path

from tools import InfoCrawler

BASE_DIR = Path('.')

if __name__ == '__main__':
    # Create a new instance of the LicenseCrawler class
    parser = argparse.ArgumentParser(description='License Crawler')
    parser.add_argument('project_path', type=str, help='Path to the project')
    args = parser.parse_args()
    project_path = BASE_DIR / args.project_path
    project_path = str(project_path.resolve())
    crawler = InfoCrawler(project_path=project_path)

    if crawler.is_valid:
        print("All licences are valid.")
        sys.exit(0)

    print("Some licences are invalid.")
    crawler.print_errors()
    sys.exit(1)

