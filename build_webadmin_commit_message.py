#!/usr/bin/python3
import asyncio
import argparse
import re
import sys
from typing import Dict, List

from dotenv import dotenv_values
import git  # pip install gitpython # Install get
import httpx # pip install httpx

REPO = git.Repo("./")
CONFIG = {
    **dotenv_values(f".env.webadmin.{REPO.active_branch}"),
    "TICKET_PATTERN": re.compile(r'(CLOUD-[\d]+)')
}

async def filter_tickets(config: Dict, tickets: List[str]) -> List[str]:
    webadmin_tickets = []
    auth = httpx.BasicAuth(config.get("EMAIL"), config.get("JIRA_TOKEN"))
    webadmin_fix_versions = config.get("WEBADMIN_FIX_VERSIONS", "").split(" ")
    jira_domain = config.get("JIRA_DOMAIN")
    for ticket in tickets:
        try:
            res = await httpx.AsyncClient().get(f"{jira_domain}/rest/agile/1.0/issue/{ticket}", auth=auth)
            res.raise_for_status()
            if fix_versions:= res.json().get("fields", {}).get("fixVersions", []):
                if any(fix_version.get('name') in webadmin_fix_versions for fix_version in fix_versions):
                    webadmin_tickets.append(ticket)
        except httpx.HTTPError:
            continue
    return webadmin_tickets

def get_tickets(repo, start_hash: str, end_hash: str, ticket_pattern: re.Pattern) -> [List[str], bool]:
    has_translations = False
    tickets_set = set()
    try:
        commits = repo.iter_commits(f"{start_hash}..{end_hash}")
        for commit in commits:
            if 'Updated translations (committed by Jenkins)' in commit.message.strip():
                has_translations = True
            tickets_set |= set(ticket_pattern.findall(commit.message.strip()))
    except git.exc.GitCommandError as e:
        print(f"Error: {e}")

    return list(tickets_set), has_translations

def build_webadmin_message(vms_update_ticket: str, next_hash: str, tickets: str, updates_translations=False) -> str:
    message = f"{vms_update_ticket}: Updates webadmin to {next_hash[:12]}\n\n" \
              f"Fixes {tickets}"
    if updates_translations:
        message += "\n\nUpdates translations"
    return message


def setup_error():
    env_file_name = f".env.webadmin.{REPO.active_branch}"
    vms_update_ticket = "VMS-28944"
    webadmin_fixes = '\"master vms_5.1_patch vms_6.0\"'
    with open(env_file_name, "w") as f:
        env_file = "EMAIL=\n"
        env_file += "JIRA_DOMAIN=https://networkoptix.atlassian.net\n"
        env_file += "JIRA_TOKEN=\n"
        env_file += f"WEBADMIN_FIX_VERSIONS={webadmin_fixes}\n"
        env_file += f"WEBADMIN_UPDATE_TICKET={vms_update_ticket}\n"
        f.write(env_file)
    error_message = "Env setup\n"
    error_message += f"1. Open {env_file_name}\n"
    error_message += f"2. Fill in your email\n"
    error_message += f"3. Go to https://id.atlassian.com/manage-profile/security/api-tokens and make a token\n"
    error_message += f"4. Add the token from step 3 to {env_file_name} JIRA_TOKEN=\n"
    error_message += f"5. Rerun the script"
    print(error_message)


def get_cmd_args(argv):
    description = "This script will automatically generate the update message for the webadmin conan update." \
                  "(Must be cleaned of non webadmin tickets)" \
                  "python generate_webadmin_commit_msg.py old_sha new_sha"
    parser = argparse.ArgumentParser("generate_webadmin_commit_msg", description=description,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("old_sha", help="Previous conan sha")
    parser.add_argument("new_sha", help="Next conan sha")

    return parser.parse_args(argv)


async def main(repo, config, args):
    git_history_tickets, has_translations = get_tickets(repo, args.old_sha, args.new_sha, config.get("TICKET_PATTERN"))
    webadmin_tickets = await filter_tickets(config, git_history_tickets)
    webadmin_vms_ticket = config.get('WEBADMIN_UPDATE_TICKET')
    msg = build_webadmin_message(webadmin_vms_ticket, args.new_sha, ", ".join(webadmin_tickets), has_translations)
    with open(f'update_webadmin_to_{args.new_sha[:12]}.txt', 'w+') as f:
        f.write(msg)


if __name__ == "__main__":
    cmd_args = get_cmd_args(sys.argv[1:])
    if "EMAIL" not in CONFIG:
        setup_error()
        sys.exit(1)
    asyncio.run(main(REPO, CONFIG, cmd_args))