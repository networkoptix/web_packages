import re
import sys

def main(scss_file):
    with open(scss_file) as f:
        match = re.search(r'\$brand_core:\s*([^;]*)', f.read())
        if match:
            brand_core_value = match.group(1)
            print(brand_core_value)
        else:
            print("red")

if __name__ == "__main__":
    main(sys.argv[1])
