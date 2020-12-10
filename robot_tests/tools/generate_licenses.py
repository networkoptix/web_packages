from NoptixLibrary.LicenseManagement import LicenseManagement

LICENSE_HOSTS = {
    'test': 'http://nxlicensed.test.hdw.mx/nxlicensed',
    'stage': 'http://nxlicensed.hdw.mx/nxlicensed'
}
AUTH = ('licautotests+admin@gmail.com', 'qweasd123')

host = input('Enter license host(test/stage): ')
if host not in {'test', 'stage'}:
    print("Input 'test' or 'stage'")
    exit()

lm = LicenseManagement(LICENSE_HOSTS[host], AUTH)

num_keys = int(input('Enter number of keys: '))
num_channels = int(input('Enter number of channels: '))
license_type = input('Enter license type(digital/iomodule/analogencoder/nvr/videowall/starter): ')
keys = lm.generate_licenses(license_type=license_type, n_packs=num_keys, n_cameras=num_channels)

if type(keys) == str:
    print(keys)
else:
    for key in keys:
        print(key)
