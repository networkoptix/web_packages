import argparse
import os
from pathlib import Path

from tools import InfoCrawler

BASE_DIR = Path('.')

if __name__ == '__main__':
    # Create a new instance of the LicenseCrawler class
    parser = argparse.ArgumentParser(description='License Crawler')
    parser.add_argument('project_path', type=str, help='Path to the project')
    parser.add_argument('--output', type=str, help='Output file', required=False)
    args = parser.parse_args()
    project_path = str(BASE_DIR / args.project_path)
    if args.output:
        output_path = str(BASE_DIR / args.output)
    else:
        output_path = None
    crawler = InfoCrawler(project_path=project_path, output_file=args.output)

    # Run the crawler
    crawler.json()
