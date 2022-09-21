class PrintDebug:
    def __init__(self, output=None):
        self.output = output or print

    def __enter__(self):
        self.output('\n' * 3)
        self.output('=' * 30)
        return self

    def __exit__(self, *args, **kwargs):
        self.output('=' * 30)
        self.output('\n' * 3)

    def log(self, *args):
        self.output(args)
