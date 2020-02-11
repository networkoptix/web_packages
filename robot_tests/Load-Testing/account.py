from locust import HttpLocust, TaskSet, task, between
import requests
from requests.auth import HTTPDigestAuth

env = "https://test3.cloud.hdw.mx/"
user = "noptixautoqa+owner@gmail.com"
password = "qweasd 123"

class UserBehavior(TaskSet):
   
    def on_start(self):
        self.client.post(env+"api/account/login", json={'email': user, 'password': password})
        self.client.get(env+"static/scripts/commons.e8331067e434e386670c.js")
        self.client.get(env+"static/scripts/polyfills.76cae54ef19218259a37.js")
        self.client.get(env+'static/scripts/vendor.2065a96d159f8c3ca2ae.js')
        self.client.get(env+"static/scripts/app.f25a083277a384fb92a8.js")
        self.client.get(env+"static/scripts/webcommon.fe29696cfd506e1165fb.js")
        self.client.get(env+"static/scripts/appnew.b2244c3f92babd721388.js")
        self.client.get(env+"static/images/sprite_common.png")
        self.client.get(env+"fonts/fonts.css")
        self.client.get(env+"fonts/roboto/roboto_medium/Roboto-Medium-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_regular/Roboto-Regular-webfont.woff") 
        self.client.get(env+"static/web_common/images/icons/languages.png")
        self.client.get(env+"static/images/favicon.ico")
        self.client.get(env+"static/lang_en_US/language_compiled.json") 
        self.client.get(env+"static/languages.json")

    @task(1)
    def get_something(self):
        self.client.get(env+"account")
        
    @task(2)
    def get_something_2(self):
        self.client.get(env+"api/utils/language")
        
    @task(3)
    def get_something_3(self):
        self.client.get(env+"api/utils/settings")
                              

class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(15, 30)