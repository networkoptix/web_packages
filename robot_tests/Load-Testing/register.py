from locust import HttpLocust, TaskSet, task, between
import json
from random import *
import time

# THIS SCRIPT DOES THE FOLLOWING:
# 1. Registers a new user[n]
# 2. Logs in as base user
# 3. Gets activation code for new user[n]
# 4. Activates new user[n] with that code
# 5. Visits accounts page (sorta)
# 6. Logs out
# it then repeats the entire thing with base user changed to the previously activated new user 


env = "https://test3.cloud.hdw.mx/"
email = "noptixautoqaload@gmail.com"
password = "qweasd 123"  
first_name = "Load"
last_name = "Tester" 

class UserBehavior(TaskSet):
    def n_method(self):
        self.n = 0
        self.user = []
    
    def log_in(self, user):
        r = self.client.post(env+"api/account/login", json={'email': user, 'password': password})
        print("Logged in as: "+user)
        print(r)
        print(r.text)
        time.sleep(3)
        self.check_cookies() 
        
    def check_cookies(self):
        if 'sessionid' in self.client.cookies:
            print("csrftoken= "+self.client.cookies['csrftoken'])
            print("sessionid= "+self.client.cookies['sessionid'])
  
  
    def on_start(self):
        self.client.get(env)
        self.client.get(env+"fonts/fonts.css")
        self.client.get(env+"static/styles/main.2b1ece9eb55118edf603.css")
        self.client.get(env+"static/scripts/commons.bfeed7e5f6a674b3dcd9.js")
        self.client.get(env+"static/scripts/polyfills.78aff2ea4eb48d269877.js")
        self.client.get(env+"static/scripts/vendor.473bbe2ca6c519bee361.js")
        self.client.get(env+"static/scripts/app.2b1ece9eb55118edf603.js")
        self.client.get(env+"static/scripts/webcommon.fe29696cfd506e1165fb.js")
        self.client.get(env+"static/scripts/appnew.41af4c232211de20e20f.js")
        self.client.get(env+"api/utils/language")
        self.client.get(env+"static/lang_en_US/language_compiled.json")
        self.client.get(env+"api/utils/settings")

        self.client.get(env+"static/languages.json")

#        self.client.get(env+"static/images/logo.png")
        self.client.get(env+"fonts/roboto/roboto_regular/Roboto-Regular-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_medium/Roboto-Medium-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_bold/Roboto-Bold-webfont.woff")
        self.client.get(env+"static/images/sprite_common.png")
        
        self.client.get(env+"static/images/favicon.ico")
        self.client.get(env+"static/web_common/images/icons/languages.png")
        self.client.get(env+"static/lang_en_US/views/static/landing.html")
     
        
        self.client.get(env+"static/images/promo/landing_promo_1.png")
        self.client.get(env+"static/images/promo/landing_promo_2.png")
        self.client.get(env+"static/images/promo/landing_promo_3.png")
        self.n_method()
        
        
    @task()
    def register(self):
    # Create new random email    
        self.code = ""
        index = email.find('@')
        self.new = email[:index] + '+' + str(randint(1, 1000)) + str(time.time()) + email[index:]
        self.user.append(self.new)
        
    # Go To register page
        self.client.get(env+"register")
        self.client.get(env+"static/scripts/commonPasswordsList.json")
        print('Get Register page')
        time.sleep(randint(10, 15))
        
    # Register with new random email
    
        r =self.client.post(env+"api/account/register", json={'email': self.user[self.n], 'password': password, 'first_name': first_name, 'last_name': last_name})
        print("Base email: "+email)
        print("New registered email: "+self.user[self.n])
        print(r.text)
        time.sleep(randint(5, 10))

    # Login with base user and get activation code for new user
        if self.n > 0:
            self.log_in(self.user[self.n-1])
        else:
            self.log_in(email)
            
    # Get activation code        
        self.client.headers.update({'X-CSRFToken': self.client.cookies['csrftoken']})
        cookie1value = self.client.cookies['csrftoken']
        print(cookie1value)
        c = self.client.post(env+"api/robot/get_code", json={'email': self.user[self.n], 'type': 'activate_account'})
        self.code = c.json()['code']
        print("Activation code for new user: "+self.code)
        time.sleep(randint(5, 10))
        
    # Activate new user 
        with self.client.post(env+"api/account/activate", json={'code': self.code}, catch_response=True) as r:
            print("New user activated")
            print(r)
            print(r.text)
            if "wrongCode" in r.text:
                self.user[self.n] = email
                r.failure("wrongCode")
                print("setting back to base due to wrongCode")
            elif not "Response [200]" in str(r):
                self.user[self.n] = email
                print("setting back to base due to NOT 200")
            time.sleep(randint(5, 10))
            self.check_cookies()
            self.n += 1
        
    # Go to activated user account page
        self.client.get(env+"account")
        self.client.get(env+"api/account")
        print("Activated user visited accounts")
        time.sleep(randint(5, 10))
        
    # Log out activated user
        r = self.client.post(env+"api/account/logout")
        print("Activated user logged out with response:")
        print(r)
        self.client.cookies.clear()
        time.sleep(randint(5, 10))  
        self.check_cookies()    
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(5, 10)