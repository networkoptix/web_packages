from random import randint


def get_random_mac():
    prefix = 'AA'
    suffix = ':'.join('%02x' % randint(0, 255) for x in range(5))
    random_mac = ':'.join((prefix, suffix)).upper()
    return random_mac


if __name__ == "__main__":
    mac = get_random_mac()
    print(mac)
