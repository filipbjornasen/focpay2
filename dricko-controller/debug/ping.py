import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import time
import logger

hostname = "focpay.xyz"
ping_logger = logger.Logger()


while True:
    response = os.system("ping -c 1 " + hostname)

    if response == 0:
        ping_logger.log_info("Connection is up!")
    else:
        while response != 0:
            response = os.system("ping -c 1 " + hostname)
            time.sleep(2)
            ping_logger.log_info("Connection is down...")

    time.sleep(10)

