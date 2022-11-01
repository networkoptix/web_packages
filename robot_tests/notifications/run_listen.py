import os

def push_notifications_swarm():
    # txtFile = str(uuid.uuid1())
    # f = open(f"{txtFile}.txt", "w+")
    # f.write("1\n")
    # f.close()
    # os.environ['LOCUSTTEXT'] = txtFile
    os.environ['LISTENERS'] = str(0)
    # os.environ['READY'] = str(0)
    # users = int(users)
    # ramp = int(ramp)
    # slaves = int(slaves)
    # seconds = int(seconds)
    #        cmd = f". Load-Testing/run_load_test_gui.sh Load-Testing/push.py {slaves}"
    #        print(f"Browse to http://localhost:8089/ use {slaves} slaves and {users} users")
    cmd = f"locust -f listen_locust.py --host=http://localhost:6000 --csv=listeners --headless -u 1 -r 1 --run-time 600s"
    print(cmd)
    os.system(cmd)

if __name__ == '__main__':
    push_notifications_swarm()