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
    postgres: PostgresConfig
    default_host: str
    debug: bool = False

    def __post_init__(self):
        self.postgres = PostgresConfig(**self.postgres)


def get_config(env_name: str):
    conf_dir = Path(__file__).resolve().parent.parent.parent.joinpath('config')
    conf_name = conf_dir.joinpath(f'channel_partners.{env_name}.yaml')
    if not conf_name.exists():
        raise ValueError(f'Cannot stat config file: {conf_name}')
    with open(conf_name, 'r') as f:
        conf_dict = yaml.safe_load(f)

    return InstanceConfig(**conf_dict)
