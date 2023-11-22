import os
import yaml
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class PostgresConfig:
    host: str
    port: int
    database: str
    username: str
    password: str


@dataclass
class InstanceConfig:
    env_name: str
    postgres: PostgresConfig
    default_host: str
    debug: bool = False
    redis_host: str = None

    def __post_init__(self):
        self.postgres = PostgresConfig(**self.postgres)
        if self.is_local_docker:
            self.postgres.host = 'postgres_cp'
            self.redis_host = 'redis_cp'

    @property
    def queue_broker_uri(self):
        if self.env_name == 'prod':
            return os.getenv('QUEUE_CELERY_BROKER_URL', None) or 'sqs://'
        return f'redis://{self.redis_host}:6379/15'

    @property
    def is_local_docker(self):
        return bool(os.getenv('LOCAL_DOCKER', False))

def get_config(env_name: str):
    conf_dir = Path(__file__).resolve().parent.parent.parent.joinpath('config')
    conf_name = conf_dir.joinpath(f'channel_partners.{env_name}.yaml')
    if not conf_name.exists():
        raise ValueError(f'Cannot stat config file: {conf_name}')
    with open(conf_name, 'r') as f:
        conf_dict = yaml.safe_load(f)

    return InstanceConfig(env_name=env_name, **conf_dict)
