from hashlib import md5, sha256

realm = "VMS"

def get_ha1_password(email, password):
    password_string = ':'.join((email, realm, password)).encode('utf-8')
    print(password_string)
    password_ha1 = md5(password_string).hexdigest()
    return password_ha1

def get_ha1_sha256_password(email, password):
    password_string = ':'.join((email, realm, password)).encode('utf-8')
    print(password_string)
    password_ha1_sha256 = sha256(password_string).hexdigest()
    return password_ha1_sha256

