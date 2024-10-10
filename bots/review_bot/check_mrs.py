import logging
import os
from collections import defaultdict

import requests

logger = logging.getLogger(__name__)

ACCESS_TOKEN = os.getenv("CANCEL_PIPELINE_ACCESS_TOKEN")
CI_SERVER_URL = os.getenv("CI_SERVER_URL")
PROJECT_ID = os.getenv("CI_PROJECT_ID")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

USER_SET = set(os.getenv("USER_SET", []).split(","))


def create_review_section(ci_server_url, user_name, mr_count, review_count):
    filtered_mrs_link = f"<{ci_server_url}/dev/cloud_portal/-/merge_requests?scope=all&state=opened&author_username={user_name}&draft=no | Open MRs: {mr_count}>"
    filtered_reviews_link = f"<{ci_server_url}/dev/cloud_portal/-/merge_requests?scope=all&state=opened&draft=no&reviewer_username={user_name}&not[approved_by_usernames][]={user_name} | MRs to Review: {review_count}>"
    return {
        "type": "section",
        "text":
            {
                "type": "mrkdwn",
                "text": f"{'@' if mr_count or review_count else ''}{user_name} - {filtered_mrs_link}\t|\t{filtered_reviews_link}"
            },
    }


def create_slack_message(review_messages):
    blocks = [{
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "*Its review time!!!*"
        }
    }]
    blocks.extend(review_messages)
    return {
        "blocks": blocks
    }


def check_mrs(ci_server_url, project_id, access_token, slack_webhook_url, portal_users):
    review_updates = []
    logger.info("Checking MRs")
    with requests.Session() as s:
        open_mrs = defaultdict(int)
        review_mrs = defaultdict(int)

        s.headers.update({ 'Authorization': f"Bearer {access_token}" })

        mrs_res = s.get(f"{ci_server_url}/api/v4/projects/{project_id}/merge_requests?state=opened&per_page=100")
        mrs = mrs_res.json()
        logger.debug(f"Fetched {len(mrs)} merge_requests")
        for mr in mrs:
            iid = mr['iid']
            author = mr['author']
            auth_username = author['username']

            if mr['draft'] or auth_username not in portal_users:
                logger.debug(f"Skipping mr {mr['iid']}")
                continue

            open_mrs[auth_username] += 1

            mr_reviewers_req = s.get(f"{ci_server_url}/api/v4/projects/{project_id}/merge_requests/{iid}/reviewers")
            reviewers = mr_reviewers_req.json()
            for reviewer in reviewers:
                username = reviewer['user']['username']
                if reviewer['state'] == 'approved' or username not in portal_users:
                    continue

                review_mrs[username] += 1

        for user in portal_users:
            review_updates.append(create_review_section(ci_server_url, user, open_mrs[user], review_mrs[user]))

    logger.info("Finished checking mrs")
    slack_message = create_slack_message(review_updates)
    try:
        response = requests.post(slack_webhook_url, headers={'Content-type':'application/json'}, json=slack_message)
        response.raise_for_status()
        logger.info("Sent slack message via webhook")
    except requests.exceptions.HTTPError:
        logger.exception("Error sending notification to slack")


if __name__ == '__main__':
    check_mrs(CI_SERVER_URL, PROJECT_ID, ACCESS_TOKEN, SLACK_WEBHOOK_URL, USER_SET)