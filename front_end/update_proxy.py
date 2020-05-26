import json
import os
from collections import OrderedDict


def fixup(adict, k, v):
    for key in adict.keys():
        if key == k:
            if adict[key] != 'https://localhost:9000':
                adict[key] = v
        elif type(adict[key]) is dict:
            fixup(adict[key], k, v)


with open('proxy.conf.json', 'r') as proxy:
    proxy_file = OrderedDict(json.load(proxy))

fixup(proxy_file, 'target', os.environ['CLOUD_INSTANCE'])

with open('proxy.conf.json', 'w') as outfile:
    json.dump(proxy_file, outfile, indent=4)

print('Cloud instance in proxy.conf set to:', os.environ['CLOUD_INSTANCE'])
