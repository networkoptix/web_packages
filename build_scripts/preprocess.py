import argparse
from pathlib import Path

import cssutils
import logging
import htmlmin
from inlinestyler.utils import inline_css
import os
import shutil
import re
import inlinestyler
from concurrent import futures
assert inlinestyler.VERSION == (0, 2, 1), "Setup correct version of inlinestyler! Try \"pip install inlinestyler==0.2.1\" and change requirements.txt accordingly"

cssutils.log.setLevel(logging.ERROR)


def read_branding(content):
    return content.replace("$brand_core", "cyan ")

executor = futures.ThreadPoolExecutor(None)


class TemplatePreprocessor:

    def __init__(self, path):
        self.templates_dir = Path(path).resolve()
        self.src_directory = Path.joinpath(self.templates_dir, 'src')
        self.container_text = open(Path.joinpath(self.src_directory, "container.txt.mustache.template")).read()
        self.container_html = open(Path.joinpath(self.src_directory,"container.mustache.template")).read()
        css_content = open(Path.joinpath(self.src_directory,"styles.css")).read()
        self.css_content = read_branding(css_content)
        self.container_html = self.container_html.replace("{{>style_css}}", self.css_content)

    def src_filename(self, filename):
        return str(Path.joinpath(self.src_directory, filename).resolve())

    def base_filename(self, filename):
        base_filename = filename.replace(".mustache.html", "").replace(".mustache.txt", "")
        return str(Path.joinpath(self.templates_dir, base_filename).resolve())

    def html_content(self, filename):
        text = self.container_html.replace("{{>body}}", open(self.src_filename(filename)).read())
        content = htmlmin.minify(inline_css(text),
                                 remove_comments=True,
                                 remove_empty_space=True,
                                 remove_optional_attribute_quotes=False)
        return content

    def write_html(self, filename):
        template_name = self.base_filename(filename) + ".mustache"
        with open(template_name, "w") as new_file:
            print(self.html_content(filename), file=new_file)

    def text_content(self, filename):
        return self.container_text.replace("{{>body}}", open(self.src_filename(filename)).read())

    def write_text(self, filename):
        template_name = self.base_filename(filename) + ".txt.mustache"
        with open(template_name, "w") as new_file:
            print(self.text_content(filename), file=new_file)

    def process_file(self, filename):
        if filename.endswith(".mustache.html"):
            self.write_html(filename)

        if filename.endswith(".mustache.txt"):
            self.write_text(filename)

    def src_files(self):
        return os.listdir(self.src_directory)


    def process_directory(self):
        instantiated_futures = [executor.submit(self.process_file, file) for file in self.src_files()]
        # Check results so any exceptions that occurred are exposed
        for future in futures.as_completed(instantiated_futures):
            future.result()

        shutil.copy(self.src_filename("notifications-language.json"), self.templates_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Preprocess templates")
    parser.add_argument("--path", help="Directory path to process", type=str, required=True)
    args = parser.parse_args()
    templates_dir = Path(args.path).resolve()
    preprocessor = TemplatePreprocessor(args.path)
    preprocessor.process_directory()

