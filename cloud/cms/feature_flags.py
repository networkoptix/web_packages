from enum import Enum


class_builtins = object.__dict__.keys()


class _FlagType(type):
    def __getattribute__(self, name):
        attr = super().__getattribute__(name)
        if name not in class_builtins and not name.startswith('_') and not name.endswith('_') and type(attr) is tuple:
            return attr[0]
        return attr

    def __getitem__(self, item):
        if item not in class_builtins and type(item) is str and not item.startswith('_') and not item.endswith('_'):
            attr = super().__getattribute__(item)
            if type(attr) is tuple:
                return attr[0]
        raise KeyError(item)

    @property
    def all_keys(self):
        return [
            key for key, item in self.__dict__.items()
            if key not in class_builtins and not key.startswith('_') and not key.endswith('_') and type(item) is tuple
        ]

    def json_key(self, name):
        attr = super().__getattribute__(name)
        return attr[1]

    def name_to_key(self, name):
        for key in self.all_keys:
            if super().__getattribute__(key)[0] == name:
                return key
        return None

    def data_structure_name(self, name):
        attr = super().__getattribute__(name)
        return attr[2] if len(attr) >= 3 else ''


class FLAGS(metaclass=_FlagType):
    # python_name = ('Human-readable and actual name', 'jsonKey', 'global_data_structure')
    custom_clients = ('Custom Clients', 'customClients', '%PUBLIC_CUSTOM_CLIENTS%')


class SWITCHES(metaclass=_FlagType):
    pass


class SAMPLES(metaclass=_FlagType):
    pass

