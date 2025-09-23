import json
import simplejson
import socket
import requests
import multiprocessing
import os
import time
from time import sleep
from typing import Optional
from gpiozero import OutputDevice
from payments import Payment
from logger import Logger


class Dricko(multiprocessing.Process):
    def __init__(self):
        multiprocessing.Process.__init__(self)

        self.auth_token = os.environ["FOC_PAY_AUTH_TOKEN"]
        self.base_url = "https://focpay.xyz/api/"
        self.headers = {"Authorization": self.auth_token}
        self.log_cooldown = 0
        self.logger = Logger()

    def api_get(self, endpoint):
        url = self.base_url + endpoint
        return requests.get(url, headers=self.headers)

    def api_post(self, endpoint, data=None):
        url = self.base_url + endpoint
        return requests.post(url, data, headers=self.headers)

    def run(self):
        payment: Optional[Payment] = None

        relay = OutputDevice(25)

        time.sleep(10)
        while True:
            try:
                rsp = self.api_get("payments/get_paid_drickomaten_payment/")
                if rsp.text:
                    try:
                        rsp = rsp.json()
                        payment = Payment(payment_id=rsp["payment_id"], payment_amount=int(rsp["amount"]))
                        self.log_cooldown = 0
                    except simplejson.JSONDecodeError as e:
                        self.logger.log_warning(f'warning: {e}')
            except socket.gaierror as e:
                self.logger.log_warning(f"warning {e}")

            if payment:
                relay.on()
                sleep(0.5)
                relay.off()

                try:
                    while True:
                        rsp = self.api_post(f"payments/{payment.payment_id}/credit_payment/").json()
                        if rsp["status"] == "credited":
                            self.logger.log_info(f"{payment.payment_id} was successfully credited!")
                            break
                        else:
                            self.logger.log_info(f"{payment.payment_id} could not be credited...")
                            self.logger.log_info("trying again...")
                            time.sleep(3)

                    payment = None
                except socket.gaierror as e:
                    self.logger.log_warning(f'warning {e}')

            else:
                self.log_cooldown -= 1
                if self.log_cooldown <= 0:
                    self.logger.log_info("dricko: no payments to credit...")
                    self.log_cooldown = 20

            # don't hit the API too often
            time.sleep(7)
            