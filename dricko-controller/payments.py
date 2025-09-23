import multiprocessing
import os
import time
from dataclasses import dataclass
from logger import Logger
import requests
import json
import simplejson
import socket

@dataclass
class Payment:
    payment_id: str
    payment_amount: int


class PaymentCreditor(multiprocessing.Process):
    def __init__(self, payments_to_credit_queue: multiprocessing.Queue, credited_payments_queue: multiprocessing.Queue):
        multiprocessing.Process.__init__(self)
        self.payments_to_credit_queue = payments_to_credit_queue
        self.credited_payments_queue = credited_payments_queue

        self.auth_token = os.environ["FOC_PAY_AUTH_TOKEN"]
        self.base_url = "https://focpay.xyz/api/"
        self.headers = {"Authorization": self.auth_token}

        self.logger = Logger()

    def api_post(self, endpoint, data=None):
        url = self.base_url + endpoint
        return requests.post(url, data, headers=self.headers)

    def run(self):
        while True:
            payment: Payment = self.payments_to_credit_queue.get()
            rsp = self.api_post(f"payments/{payment.payment_id}/credit_payment/").json()
            
            if rsp["status"] == "credited":
                self.logger.log_info(f"{payment.payment_id} was successfully credited!")
                self.credited_payments_queue.put(payment)
            else:
                self.logger.log_info(f"{payment.payment_id} could not be credited...")
                self.logger.log_info("trying again...")
                self.payments_to_credit_queue.put(payment)
                time.sleep(3)


class PaymentPoller(multiprocessing.Process):
    def __init__(self, queue: multiprocessing.Queue):
        multiprocessing.Process.__init__(self)
        self.queue = queue

        self.auth_token = os.environ["FOC_PAY_AUTH_TOKEN"]
        self.base_url = "https://focpay.xyz/api/"
        self.headers = {"Authorization": self.auth_token}

        self.log_cooldown = 0
        self.logger = Logger()
        
    def api_get(self, endpoint):
        url = self.base_url + endpoint
        return requests.get(url, headers=self.headers)

    def run(self):
        time.sleep(10)
        while True:
            try:
                rsp = self.api_get("payments/get_paid_focumama_payment/")
                if rsp.text:
                    try:
                        rsp = rsp.json()
                        self.logger.log_warning(rsp)
                        payment = Payment(payment_id=rsp["payment_id"], payment_amount=int(rsp["amount"]))
                        self.queue.put(payment)
                        self.log_cooldown = 0
                        break  # TODO: kill process when finished running, else they become defunct
                    except simplejson.JSONDecodeError as e:
                        self.logger.log_warning(f'warning: {e}')
            except socket.gaierror as e:
                self.logger.log_warning(f"warning {e}")

            # don't hit the API too often
            time.sleep(5)

            self.log_cooldown -= 1
            if self.log_cooldown <= 0:
                self.logger.log_info("no payments to credit...")
                self.log_cooldown = 20
                