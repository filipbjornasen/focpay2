import json
import simplejson
import socket
import requests
import os
import time
from time import sleep
from gpiozero import OutputDevice
from gpiozero.pins.mock import MockFactory
import logging
from dotenv import load_dotenv
import sys
import psutil

#OutputDevice.pin_factory = MockFactory() # Uncomment this line to use mock GPIO pins for testing

load_dotenv()

import logging, os, sys

logger = logging.getLogger("dricko")
logger.setLevel(logging.DEBUG)  # make sure logger itself allows DEBUG

logging.basicConfig(
    filename="dricko.log",
    level=logging.INFO,  # keep INFO for file
    format="%(asctime)s : %(levelname)s : %(message)s"
)

environment = os.environ["ENVIRONMENT"]

if environment == "development":
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter("%(asctime)s : %(levelname)s : %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class Dricko():
    def __init__(self):
        self.auth_token = os.environ["FOC_PAY_AUTH_TOKEN"]
        self.base_url = os.environ["DRICKO_BASE_API_URL"]
        self.headers = {"Authorization": "Bearer " + self.auth_token}
        self.log_cooldown = 0

    def api_get(self, endpoint):
        url = self.base_url + endpoint
        return requests.get(url, headers=self.headers)

    def api_patch(self, endpoint):
        url = self.base_url + endpoint
        return requests.patch(url, headers=self.headers)

    def run(self):
        logger.info("Starting dricko handler...")
        payment = None

        relay = OutputDevice(25)

        time.sleep(10)
        time_since_usage_log = 10
        while True:
            try:
                try:
                    logger.debug("Checking for payments to credit...")
                    time_since_usage_log += 1
                    if time_since_usage_log >= 10:
                        usage = psutil.virtual_memory()
                        logger.info(f"Memory usage: {usage.percent}%")
                        time_since_usage_log = 0

                    rsp = self.api_get("payments/oldest-paid/")
                    if rsp.status_code == 200:
                        if rsp.text:
                            try:
                                logger.debug("Got a payment to credit!")
                                rsp = rsp.json()
                                payment = rsp['payment']
                                self.log_cooldown = 0
                            except simplejson.JSONDecodeError as e:
                                logger.warning(f'warning json: {e}')
                except socket.gaierror as e:
                    logger.warning(f"warning gai {e}")

                if payment != None:
                    if environment == "production":
                        relay.on()
                        sleep(0.5)
                        relay.off()

                    try:
                        while True:
                            logger.debug(f"Crediting payment {payment['id']}...")
                            rsp = self.api_patch(f"payments/{payment['id']}/credit").json()
                            logger.debug(f"Credit response: {rsp}")
                            if rsp['payment']["status"] == "CREDITED":
                                logger.info(f"{payment['id']} was successfully credited!")
                                break
                            else:
                                logger.info(f"{payment['id']} could not be credited...")
                                logger.info("trying again...")
                                time.sleep(3)

                        payment = None
                    except socket.gaierror as e:
                        logger.warning(f'warning {e}')

                else:
                    self.log_cooldown -= 1
                    if self.log_cooldown <= 0:
                        logger.info("dricko: no payments to credit...")
                        self.log_cooldown = 20
            except Exception as e:
                logger.error(f"dricko: unhandled exception: {e}")
                time.sleep(10)
            # don't hit the API too often
            time.sleep(7)

if __name__ == "__main__":
    dricko = Dricko()
    dricko.run()