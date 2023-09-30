import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class DbManager:
    def __init__(self):
        engine = create_engine(os.getenv('DB_URI') or 'sqlite:///../test.sqlite3')
        Session = sessionmaker(bind=engine)
        self.session = Session()

    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        self.session.close()

    def create(self, objs, *, many=False):
        if not many:
            objs = [objs]
        for obj in objs:
            self.session.add(obj)
        self.session.commit()