import os

DEBUG = os.getenv("DEBUG", 'False').lower() in ('true', '1', 't')
ENV = os.getenv("ENV", 'production')

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')

REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'
