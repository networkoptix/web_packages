from locust import HttpLocust, TaskSet, task, between
import json

env = "https://test3.cloud.hdw.mx/"
user = "noptixautoqa+loadtester@gmail.com"
password = "qweasd 123"   
class UserBehavior(TaskSet):  
    
    def on_start(self):
        
        self.client.post(env+"api/account/login", json={'email': user, 'password': password})
        self.client.get(env+"systems/85660de0-3740-4e5e-b4d4-360267e36afe/view/c0c1730f-d646-3eca-c526-4f2a45d7a9d3")
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
        self.client.get(env+"static/lang_en_US/views/view.html")
#        self.client.get(env+"static/images/logo.png")
        self.client.get(env+"fonts/roboto/roboto_regular/Roboto-Regular-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_medium/Roboto-Medium-webfont.woff")
        self.client.get(env+"fonts/roboto/roboto_bold/Roboto-Bold-webfont.woff")
        self.client.get(env+"api/account")
        self.client.get(env+"static/lang_en_US/web_common/views/components/placeholder.html")
        self.client.get(env+"api/systems")
        self.client.get(env+"static/images/sprite_common.png")
        self.client.get(env+"static/images/favicon.ico")
        self.client.get(env+"api/systems")
        
        r = self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe/auth")
        y = r.text
#        print(y)
        x = y.split('"')
        auth1 = x[3]
#        print(auth1)
        
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
         
        r = self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe/auth")
        y = r.text
#        print(y)
        x = y.split('"')
        auth2 = x[3]
#        print(auth2)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getResourceTypes?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getResourceTypes?auth=\n"+j.text)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetMediaServersEx&exec_cmd=ec2%2FgetCamerasEx&auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetMediaServersEx&exec_cmd=ec2%2FgetCamerasEx&auth=\n"+j.text)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getCamerasEx?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getCamerasEx?auth=\n"+j.text)
         
        self.client.get(env+"static/lang_en_US/web_common/views/components/view.html")
         
        self.client.get(env+"static/lang_en_US/web_common/views/components/cameraPanel.html")
         
        self.client.get(env+"static/lang_en_US/web_common/views/components/videowindow.html")
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getUsers?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getUsers?auth=\n"+j.text)         
         
        self.client.get(env+"static/lang_en_US/web_common/views/components/cameraStatus.html")
         
        self.client.get(env+"static/lang_en_US/web_common/views/components/timeline.html")
         
        self.client.get(env+"static/web_common/images/icons/web_interface_sprite.png")
         
        self.client.get(env+"static/web_common/images/timeline-loading.png")
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getTimeOfServers?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getTimeOfServers?auth=\n"+j.text)
          
        j = self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/synchronizedTime?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/synchronizedTime?auth=\n"+j.text)           
        resp_dict = json.loads(j.text)
        startTime = int(resp_dict['reply']['utcTimeMs'])+311
        endTime = startTime + 100000
        endTime2 = startTime + 4000000
#        print(startTime,endTime)
        startTime = str(startTime)
        endTime = str(endTime)
        endTime2 = str(endTime2)
         
        self.client.get(env+"api/systems/85660de0-3740-4e5e-b4d4-360267e36afe")
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getResourceTypes?auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getResourceTypes?auth=\n"+j.text)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth="+auth1)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetUsers&exec_cmd=ec2%2FgetPredefinedRoles&exec_cmd=ec2%2FgetUserRoles&auth=\n"+j.text)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetMediaServersEx&exec_cmd=ec2%2FgetCamerasEx&auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/api/aggregator?exec_cmd=ec2%2FgetMediaServersEx&exec_cmd=ec2%2FgetCamerasEx&auth=\n"+j.text)
             
        self.client.get(env+"static/lang_en_US/web_common/views/components/cameraNode.html")
         
#        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/recordedtimePeriods?flat&keepSmallChunks&&cameraId=c0c1730f-d646-3eca-c526-4f2a45d7a9d3&startTime="+startTime+"&endTime="+endTime+"&detail=1&periodsType=0&limit=100&auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/recordedtimePeriods?flat&keepSmallChunks&&cameraId=c0c1730f-d646-3eca-c526-4f2a45d7a9d3&startTime="+startTime+"&endTime="+endTime+"&detail=1&periodsType=0&limit=100&auth="+auth2+"\n"+j.text)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/cameraThumbnail?ignoreExternalArchive&cameraId=c0c1730f-d646-3eca-c526-4f2a45d7a9d3&time=LATEST&height=1351&auth="+auth2)

        j = self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/hls/c0c1730f-d646-3eca-c526-4f2a45d7a9d3.m3u8?lo&auth="+auth2)
#        print("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/getResourceTypes?auth=\n"+j.text)
        y = j.text
#        print(y)
        x = y.split('https://')
        self.url = x[1].replace(":443","")
#        print(self.url)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/cameraThumbnail?ignoreExternalArchive&cameraId=786086a2-0cef-a2db-7c76-eba5207927ea&time=LATEST&height=128&auth="+auth2)
         
        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/cameraThumbnail?ignoreExternalArchive&cameraId=c0c1730f-d646-3eca-c526-4f2a45d7a9d3&time=LATEST&height=128&auth="+auth2)
         
        j = self.client.get("https://"+self.url)
#        print("https://"+self.url+"/n"+j.text)
        y = j.text
        x = y.split('https://')
        z = x[1].split('#')
        url2 = z[0].replace(":443","")
        w = x[2].split('#')
        url3 = w[0].replace(":443","")
        url4 = x[3].replace(":443","")
         
        self.client.get("https://"+url2)
         
        self.client.get(env+"6a057646-c1b6-4d77-bd4c-a31487065e67")
         
        self.client.get("https://"+url3)
         
        self.client.get("https://"+url4)
         
#        self.client.get("https://85660de0-3740-4e5e-b4d4-360267e36afe.relay.vmsproxy.hdw.mx/web/ec2/recordedTimePeriods?flat&keepSmallChunks&Age&cameraId=c0c1730f-d646-3eca-c526-4f2a45d7a9d3&startTime=0&endTime="+endTime2+"&detail=3155760000000&periodsType=0&auth="+auth2)
        
    
    
    @task(1)
    def get_something_2(self): 
        j = self.client.get("https://"+self.url)
#        print("https://"+self.url+"/n"+j.text)
        y = j.text
        x = y.split('https://')
        z = x[1].split('#')
        url2 = z[0].replace(":443","")
        w = x[2].split('#')
        url3 = w[0].replace(":443","")
        url4 = x[3].replace(":443","")
        
        self.client.get("https://"+url4)
        
class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    wait_time = between(5, 6)