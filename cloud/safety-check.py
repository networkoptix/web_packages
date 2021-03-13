import json
import subprocess
import sys


def main():
    print('Checking for safety issues with pip packages')

    with open('safety-whitelist.json') as f:
        safety_whitelist = json.load(f)

    command = 'safety check --full-report '
    command += '-i ' + ' -i '.join(safety_whitelist.keys())
    try:
        safety_report = subprocess.check_output(command, shell=True)
    except subprocess.CalledProcessError as error:
        print(error.output.decode('utf-8'))
        print('Vulnerability issues found in pip packages. Please notify web team.')
        sys.exit(error.returncode)
    else:
        print(safety_report.decode('utf-8'))


if __name__ == '__main__':
    main()
