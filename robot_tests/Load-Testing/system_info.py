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
        self.client.get(env+"api/account")
#        self.client.get(env+"static/images/logo.png")
        self.client.get(env+"fonts/roboto/roboto_regular/Roboto-Regular-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_medium/Roboto-Medium-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_bold/Roboto-Bold-webfont.woff")
        self.client.get(env+"api/systems")
        self.client.get(env+"static/images/sprite_common.png")
        
        self.client.get(env+"static/images/favicon.ico")
        self.client.get(env+"api/systems")
        self.client.get(env+"api/systems")
        
        r = self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe/auth")
        y = r.text
#        print(y)
        x = y.split('"')
        self.auth1 = x[3]
#        print(auth1)        
        
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2Fmetrics%2Fmanifest&exec_cmd=ec2%2Fmetrics%2Fvalues&exec_cmd=ec2%2Fmetrics%2Falarms&auth="+self.auth1)
    
        self.client.get(env+"static/icons/reload.svg")
        self.client.get(env+"static/icons/download.svg")
        self.client.get(env+"static/icons/error.svg")
        self.client.get(env+"static/icons/warning.svg")
        self.client.get(env+"static/icons/alerts.svg")
        self.client.get(env+"static/icons/systems.svg")
        
        self.client.get(env+"static/icons/servers.svg")
        self.client.get(env+"static/icons/cameras.svg")
        self.client.get(env+"static/icons/storages.svg")
        self.client.get(env+"static/icons/networkInterfaces.svg")
    
    @task(1)
    def get_something_2(self): 
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/health/systems")
        
        
    @task(2)
    def get_something_3(self):  
        self.client.get(env+"api/account")
 
        
    @task(3)
    def get_something_4(self):  
        self.client.get(env+"api/systems")
        
        
    @task(4)
    def get_something_5(self):  
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)

    @task(5)
    def get_something_6(self):  
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/health/servers")
        
    @task(6)
    def get_something_7(self):  
        self.client.get(env+"api/account")
 
        
    @task(7)
    def get_something_8(self):  
        self.client.get(env+"api/systems")
        
        
    @task(8)
    def get_something_9(self):  
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)

        
    @task(9)
    def get_something_10(self):  
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/health/cameras")
        self.client.get(env+"static/images/web_interface_sprite.png")

        
    @task(10)
    def get_something_11(self): 
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")


    @task(11)
    def get_something_12(self):  
        self.client.get(env+"api/account")
 
        
    @task(12)
    def get_something_13(self):  
        self.client.get(env+"api/systems")
        
        
    @task(13)
    def get_something_14(self):  
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)


    @task(14)
    def get_something_15(self):  
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/health/storages")    
        
    @task(15)
    def get_something_16(self): 
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")


    @task(16)
    def get_something_17(self):  
        self.client.get(env+"api/account")
 
        
    @task(17)
    def get_something_18(self):  
        self.client.get(env+"api/systems")
        
        
    @task(18)
    def get_something_19(self):  
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)


    @task(19)
    def get_something_20(self):  
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/health/networkInterfaces")   
        
    @task(20)
    def get_something_21(self): 
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")


    @task(21)
    def get_something_22(self):  
        self.client.get(env+"api/account")
 
        
    @task(22)
    def get_something_23(self):  
        self.client.get(env+"api/systems")
        
        
    @task(23)
    def get_something_24(self):  
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+self.auth1)

        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(5, 10)