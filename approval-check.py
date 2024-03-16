import fnmatch
import sys
import os
import requests

nhartleb = 'nhartleb'
rbarsegian = 'rbarsegian'
ttsolov = 'ttsolov'

default_code_owners = [nhartleb, rbarsegian]

def check_glob_pattern(pattern, filenames):
    return fnmatch.filter(filenames, pattern)

def create_code_owner_rule(pattern, code_owners=None, required_approvals=1):
    code_owners = code_owners or default_code_owners
    def rule(changed_files, approvals_usernames):
        code_owners_set = set(code_owners)
        approval_users_set = set(approvals_usernames)
        owners_not_approved = code_owners_set.difference(approval_users_set)
        approvals = len(code_owners_set.intersection(approval_users_set))
        additional_approvals_required = max(required_approvals - approvals, 0)
        approvals_required = additional_approvals_required and check_glob_pattern(pattern, changed_files)
        return approvals_required and f'Need {additional_approvals_required} approval{"s" if additional_approvals_required > 1 else ""} from {owners_not_approved} for "{pattern}"'

    return rule

# Define the rules to check. Currently we only have rules created by the create_code_owner_rule factory.
# We'll probably add more sophisticated rules in the future.
rules = [
    create_code_owner_rule('build_scripts/**/*'),
    create_code_owner_rule('ci/**/*'),
    create_code_owner_rule('cloud/**/*'),
    create_code_owner_rule('deploy/**/*'),
    create_code_owner_rule('front_end/**/*', [ttsolov] + default_code_owners),
    create_code_owner_rule('webadmin/**/*')
    # create_code_owner_rule('**/*') # Maybe we use this in the future.
]

def check_approval_rules(approval_endpoint, access_token, target_commit):
    print('Checking approval rules...')
    headers = {
        'Accept': 'application/json',
        'PRIVATE-TOKEN': access_token,
    }
    approvals = requests.get(approval_endpoint, headers=headers).json()['approved_by']
    approvals_usernames = [approval['user']['username'] for approval in approvals]
    changed_files = [f'./{file}' for file in os.popen(f'git diff --name-only {target_commit}..@').read().splitlines()]

    if not changed_files:
        print('Error getting diff files. Exiting...')
        exit(69)

    print(f'Changed files: {len(changed_files)}')
    print(f'Current Approvals: {", ".join(approvals_usernames)}')

    return [error for rule in rules if (error := rule(changed_files, approvals_usernames))]

if __name__ == '__main__':
    if errors := check_approval_rules(*sys.argv[1:4]):
        print('Approval rules failed')
        for error in errors:
            print(error)
        exit(69)
    else:
        print('Approval rules passed')