from locust import HttpLocust, TaskSet, task, between
import json

env = "https://test3.cloud.hdw.mx/"
user = "noptixautoqa+loadtester@gmail.com"
password = "qweasd 123"   
class UserBehavior(TaskSet):  
    
    def on_start(self):
        
        self.client.post(env+"api/account/login", json={'email': user, 'password': password})
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get(env+"fonts/fonts.css")
        self.client.get(env+"static/styles/main.f25a083277a384fb92a8.css")
        self.client.get(env+"static/scripts/commons.e8331067e434e386670c.js")
        self.client.get(env+"static/scripts/polyfills.76cae54ef19218259a37.js")
        self.client.get(env+"static/scripts/vendor.2065a96d159f8c3ca2ae.js")
        self.client.get(env+"static/scripts/app.f25a083277a384fb92a8.js")
        self.client.get(env+"static/scripts/webcommon.fe29696cfd506e1165fb.js")
        self.client.get(env+"static/scripts/appnew.b2244c3f92babd721388.js")
        self.client.get(env+"api/utils/language")
        self.client.get(env+"static/lang_en_US/language_compiled.json")
        self.client.get(env+"api/utils/settings")
        self.client.get(env+"api/account")
        self.client.get(env+"static/languages.json")
        self.client.get(env+"api/account")
#        self.client.get(env+"static/images/logo.png")
        self.client.get(env+"fonts/roboto/roboto_regular/Roboto-Regular-webfont.woff")
        self.client.get(env+"api/systems")
        self.client.get(env+"static/images/sprite_common.png")
        self.client.get(env+"fonts/roboto/roboto_medium/Roboto-Medium-webfont.woff")
        self.client.get(env+"static/images/favicon.ico")
        self.client.get(env+"api/systems")
        self.client.get(env+"api/systems")
        
        r = self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe/auth")
        y = r.text
#        print(y)
        x = y.split('"')
        self.auth1 = x[3]
#        print(auth1)
        
        
         
        r = self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe/auth")
        y = r.text
#        print(y)
        x = y.split('"')
        self.auth2 = x[3]
#        print(auth2)
        
        self.client.get(env+"fonts/roboto/roboto_bold/Roboto-Bold-webfont.woff")
        
    
    
    @task(1)
    def get_something_2(self): 
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth2)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/systemSettings?auth="+self.auth2)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/systemSettings?auth="+self.auth2)
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth2)
       
    @task(2)
    def get_something_3(self):  
        self.client.get(env+"api/account")
        self.client.get(env+"api/systems")
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth2)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/systemSettings?sessionLimitMinutes=60&auth="+self.auth2)
        
    @task(3)
    def get_something_4(self):  
        self.client.get(env+"api/account")
        self.client.get(env+"api/systems")
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth2)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/systemSettings?statisticsAllowed=false&auth="+self.auth2)    
        
    @task(4)
    def get_something_5(self):  
        self.client.get(env+"api/account")
        self.client.get(env+"api/systems")
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth2)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/systemSettings?statisticsAllowed=true&auth="+self.auth2)
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(15, 30)