from quart import current_app

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from main import app as current_app

import async_timeout
import asyncio


email_queues = dict()


def add_to_email_queue(email, queue):
    if email in email_queues:
        email_queues[email].add(queue)
    else:
        email_queues[email] = {queue}


def remove_from_email_queue(email, queue):
    if email in email_queues:
        email_queues[email].remove(queue)
        if len(email_queues[email]) == 0:
            del email_queues[email]


def message_handler_factory(email):
    async def handler(message):
        for queue in email_queues[email]:
            await queue.put(message)
    return handler


async def setup_polling():
    from main import redis_pubsub
    await redis_pubsub.subscribe('init_subscription')

    while not current_app.shutting_down:
        try:
            async with async_timeout.timeout(2):
                await redis_pubsub.get_message(ignore_subscribe_messages=True)
                await asyncio.sleep(0.01)
        except asyncio.TimeoutError:
            pass

    await redis_pubsub.unsubscribe()


async def start_listening(email, socket_queue, provider_protocol):
    from main import redis_pubsub
    add_to_email_queue(email, socket_queue)
    await redis_pubsub.subscribe(**{email: message_handler_factory(email)})
    await provider_protocol.send_listener_established(email)


async def stop_lisening(email, socket_queue):
    from main import redis_pubsub
    remove_from_email_queue(email, socket_queue)
    if email not in email_queues:
        await redis_pubsub.unsubscribe(email)
