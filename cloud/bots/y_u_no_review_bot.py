import os

from discord_webhook import DiscordWebhook
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport

from discord_users import user_lookup

EXCLUDE_ZERO = os.getenv('EXCLUDE_ZERO')
ACCESS_TOKEN = os.getenv('CANCEL_PIPELINE_ACCESS_TOKEN')
DISCORD_WEBHOOK = os.getenv('DISCORD_WEBHOOK')
CI_SERVER_URL = os.getenv('CI_SERVER_URL')
REVIEW_BOT_USERNAME = os.getenv('REVIEW_BOT_USERNAME', 'y U No rEviEW!')
REVIEW_BOT_AVATAR = os.getenv(
    'REVIEW_BOT_AVATAR', 'https://i.imgflip.com/62a87x.jpg')
GRAPHQL_API = f'{CI_SERVER_URL}/api/graphql'

transport = AIOHTTPTransport(url=GRAPHQL_API, headers={
                             'PRIVATE-TOKEN': ACCESS_TOKEN})
client = Client(transport=transport, fetch_schema_from_transport=True)

query = gql(
    """
    fragment assigned on MergeRequestAssigneeConnection {
        nodes {
            username
            mergeRequestInteraction {
                approved
            }
        }
    }

    fragment reviewer on MergeRequestReviewerConnection {
        nodes {
            username
            mergeRequestInteraction {
                approved
            }
        }
    }

    query getMergeRequests {
        project(fullPath: "dev/cloud_portal") {
            mergeRequests(state: opened) {
            nodes {
                author {
                    username
                }
                approvalsLeft
                reviewers {
                    ...reviewer
                }
                assignees {
                    ...assigned
                }
            }
            }
        }
    }
"""
)

cloud_portal_project = client.execute(query)['project']

MR_LIST = cloud_portal_project['mergeRequests']['nodes'] if cloud_portal_project else []

summary = {username: {'id': user_id, 'open': 0, 'assigned': 0}
           for username, user_id in user_lookup.items()}

for mr in MR_LIST:
    if mr['approvalsLeft'] and (author := mr['author']['username']) in user_lookup:
        summary[author]['open'] += 1
        assigned = mr['reviewers']['nodes'] + mr['assignees']['nodes']
        for user in assigned:
            if not user['mergeRequestInteraction']['approved'] and (username := user['username']) in user_lookup:
                summary[username]['assigned'] += 1

char_map = {
    '0': ":zero:",
    '1': ":one:",
    '2': ":two:",
    '3': ":three:",
    '4': ":four:",
    '5': ":five:",
    '6': ":six:",
    '7': ":seven:",
    '8': ":eight:",
    '9': ":nine:"
}


def styled(qty):
    mapped_qty = ''.join(map(lambda char: char_map[char], str(qty)))

    if qty > 7:
        wtf = ':regional_indicator_w::regional_indicator_t::regional_indicator_f::exclamation:'
        return mapped_qty + wtf

    if not qty:
        fire = ':fire:'
        return mapped_qty + fire

    return mapped_qty


def to_message(user):
    num_open = user['open']
    num_assigned = user['assigned']
    return f"<@{user['id']}> has {styled(num_open)} open merge request and {styled(num_assigned)} assigned"

values = summary.values()

content = "\n".join(map(to_message, filter(
    lambda user: user['open'] or user['assigned'] or not EXCLUDE_ZERO, values)))

allowed_mentions = [user['id'] for user in values if user['open'] or user['assigned']]

content = content or 'No merge requests pending approval'

webhook = DiscordWebhook(url=DISCORD_WEBHOOK, username=REVIEW_BOT_USERNAME,
                         avatar_url=REVIEW_BOT_AVATAR, content=content, allowed_mentions={'users': allowed_mentions})
response = webhook.execute()
