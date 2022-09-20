import os
from discord_users import user_lookup

import discord

TOKEN = os.getenv('DISCORD_TOKEN')
GUILD = os.getenv('DISCORD_GUILD')
GITLAB_USER_EMAIL = os.getenv('GITLAB_USER_EMAIL')
CI_PROJECT_URL = os.getenv('CI_PROJECT_URL')
CI_MERGE_REQUEST_IID = os.getenv('CI_MERGE_REQUEST_IID')

SAD_MR = f'{CI_PROJECT_URL}/-/merge_requests/{CI_MERGE_REQUEST_IID}'
TARGET_USER = user_lookup.get(GITLAB_USER_EMAIL.split('@')[0])

client = discord.Client(intents=discord.Intents.all())


@client.event
async def on_ready():
    if CI_MERGE_REQUEST_IID:
        await disappointment()
    else:
        print('run persistent mode')

    await client.close()


async def disappointment():
    if not all([TARGET_USER, TOKEN, GITLAB_USER_EMAIL, CI_MERGE_REQUEST_IID]):
        await client.close()

    user = await fetch_user()

    shame = f'y U nO suCCeeD pIPeliNE !! u BriNg shAme 2 uR faMilY aNd tO MR {CI_MERGE_REQUEST_IID}'
    disown = f'fIx {SAD_MR} b4 uR FamiLY disOWn U !!'

    await user.send(shame)
    await user.send(disown)


async def fetch_user():
    try:
        user = await client.fetch_user(TARGET_USER)
    except:
        user = await client.fetch_user(user_lookup['czach'])
        await user.send(f'Need to add {GITLAB_USER_EMAIL} or fix that users ID in the lookup')
        await client.close()
    return user


client.run(TOKEN)
