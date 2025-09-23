import json
import multiprocessing
import multiprocessing.context
import os
import time
from enum import Enum
from queue import Empty
from typing import Optional, Union
import requests
import serial
from logger import Logger
from payments import Payment, PaymentPoller

from mdb_constants import (
    AMC_ACK,
    AMC_DATA_FRAME_END,
    AMC_DATA_FRAME_START,
    AMC_NAK,
    AMC_STX,
    CMD_EXPANSION,
    CMD_EXPANSION_DIAGNOSTICS,
    CMD_EXPANSION_REQUEST_ID,
    CMD_POLL,
    CMD_READER,
    CMD_READER_CANCEL,
    CMD_READER_DISABLE,
    CMD_READER_ENABLE,
    CMD_RESET,
    CMD_RESET_FULL,
    CMD_SETUP,
    CMD_SETUP_CONFIG,
    CMD_SETUP_CONFIG_FULL,
    CMD_SETUP_MAXMIN,
    CMD_SETUP_MAXMIN_FULL,
    CMD_VEND,
    CMD_VEND_CANCEL,
    CMD_VEND_CASH_SALE,
    CMD_VEND_FAILURE,
    CMD_VEND_REQUEST,
    CMD_VEND_SESSION_COMPLETE,
    CMD_VEND_SUCCESS,
    RSP_ACK,
    RSP_BEGIN_SESSION,
    RSP_CANCELLED,
    RSP_CMD_OUT_OF_SEQ,
    RSP_DIAGNOSTICS,
    RSP_END_SESSION,
    RSP_JUST_RESET,
    RSP_PERIPHERAL_ID,
    RSP_SETUP_CONFIG,
    RSP_VEND_APPROVED,
    RSP_VEND_DENIED,
)

# find port with 'python -m serial.tools.list_ports'
SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 115_200
State = Enum("State", "INACTIVE DISABLED ENABLED SESSION_IDLE VEND")


class MamaHandler(multiprocessing.context.Process):
    def __init__(self, incoming_payments_queue: multiprocessing.Queue, payments_to_credit_queue: multiprocessing.Queue, credited_payments_queue: multiprocessing.Queue) -> None:
        multiprocessing.Process.__init__(self)
        self.incoming_payments_queue = incoming_payments_queue
        self.payments_to_credit_queue = payments_to_credit_queue
        self.credited_payments_queue = credited_payments_queue

        self.payment_poller = PaymentPoller(incoming_payments_queue)
        self.payment_poller.start()

        self.state: State = State.INACTIVE

        self.current_payment: Optional[Payment] = None  # type: ignore
        self.current_price = -1
        self.future_vend_response = RSP_VEND_DENIED
        self.logger = Logger()

    def run(self) -> None:
        print("starting process")

        self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE)  # TODO: maybe close connection?

        while True:
            frame = self.get_frame()

            if frame is not None:
                self.handle_frame(frame)

    def get_frame(self) -> Union[bytes, None]:
        s = self.ser.read(1)
        if s == AMC_ACK:
            return None

        if s == AMC_NAK:
            return None

        if s == AMC_STX:
            s = s + self.ser.read_until(AMC_DATA_FRAME_END)
            start = s.find(AMC_DATA_FRAME_START) + len(AMC_DATA_FRAME_START)
            end = s.find(AMC_DATA_FRAME_END, start)
            frame: bytes = s[start:end]
            self.ser.write(AMC_ACK)
            return frame

        return None

    def send_frame(self, frame: bytes) -> None:
        response = AMC_DATA_FRAME_START + frame + AMC_DATA_FRAME_END
        self.ser.write(response)
        self.logger.log_serial_out(frame, self.state)

    def handle_frame(self, frame: bytes) -> None:
        # increase "cooldown counter"

        cmd = frame[0:1]

        if len(frame) > 1:
            full_cmd = frame[0:2]
        else:
            full_cmd = None
        self.logger.log_serial_in(frame, self.state)

        if cmd == CMD_RESET:
            if full_cmd == CMD_RESET_FULL:
                self.logger.log_info("INACTIVE")
                self.state = State.INACTIVE
                self.send_frame(RSP_ACK)

            else:
                self.handle_the_unhandleable(frame)
                self.logger.log_error("Unknown RESET command!")

        elif cmd == CMD_SETUP:
            if full_cmd == CMD_SETUP_CONFIG:
                self.send_frame(RSP_SETUP_CONFIG)
                if frame != CMD_SETUP_CONFIG_FULL:
                    self.logger.log_warning("Unexpected CMD_SETUP_CONFIG_FULL payload")

            elif full_cmd == CMD_SETUP_MAXMIN:
                self.send_frame(RSP_ACK)
                if frame != CMD_SETUP_MAXMIN_FULL:
                    self.logger.log_warning("Unexpected SETUP_MAXMIN payload")

            else:
                self.handle_the_unhandleable(frame)
                self.logger.log_error("Unknown SETUP command!")

        elif cmd == CMD_POLL:
            if self.state is State.INACTIVE:
                self.send_frame(RSP_JUST_RESET)

            elif self.state is State.DISABLED:
                self.send_frame(RSP_ACK)

            elif self.state is State.ENABLED:
                try:
                    self.current_payment: Payment = self.incoming_payments_queue.get_nowait()
                    self.logger.log_info(f"{self.current_payment.payment_id} should be credited, starting vend session")
                    self.state = State.SESSION_IDLE
                    self.send_frame(RSP_BEGIN_SESSION)
                except Empty:
                    # reset "cooldown counter"
                    self.send_frame(RSP_ACK)

            elif self.state is State.SESSION_IDLE:
                self.send_frame(RSP_ACK)

            elif self.state is State.VEND:
                # in the future, check balance here and if valid, subtract balance
                if self.current_payment:
                    if self.current_payment.payment_amount == self.current_price:
                        self.logger.log_info(f"{self.current_payment.payment_id} will now be credited (vend approved!)")
                        self.future_vend_response = RSP_VEND_APPROVED
                    else:
                        self.logger.log_info(f"{self.current_price=} != {self.current_payment.payment_amount=}")
                        self.logger.log_info(f"{self.current_payment.payment_id} will now be credited (vend NOT approved!)")
                        self.future_vend_response = RSP_VEND_DENIED

                    self.payments_to_credit_queue.put(self.current_payment)
                    self.current_payment = None
                    self.current_price = -1
                    self.send_frame(RSP_ACK)

                try:
                    self.credited_payments_queue.get_nowait()
                    self.send_frame(self.future_vend_response)

                    self.payment_poller = PaymentPoller(self.incoming_payments_queue)
                    self.payment_poller.start()

                except Empty:
                    self.send_frame(RSP_ACK)

        elif cmd == CMD_VEND:
            if full_cmd == CMD_VEND_REQUEST:
                self.current_price = int(int.from_bytes(frame[2:4], byteorder="big") / 100)
                if self.state is not State.SESSION_IDLE:
                    self.send_frame(RSP_CMD_OUT_OF_SEQ)
                    self.logger.log_error("VEND_REQUEST from state != SESSION_IDLE is not OK")
                else:
                    self.logger.log_info("VEND")
                    self.state = State.VEND
                    self.send_frame(RSP_ACK)

            elif full_cmd == CMD_VEND_CANCEL:
                self.logger.log_info("SESSION_IDLE")
                self.state = State.SESSION_IDLE
                self.send_frame(RSP_VEND_DENIED)

            elif full_cmd == CMD_VEND_SUCCESS:
                self.send_frame(RSP_ACK)

            elif full_cmd == CMD_VEND_FAILURE:
                self.send_frame(RSP_ACK)

            elif full_cmd == CMD_VEND_SESSION_COMPLETE:
                self.logger.log_info("VEND finished!")
                self.logger.log_info("ENABLED")
                self.state = State.ENABLED
                self.send_frame(RSP_END_SESSION)

            elif full_cmd == CMD_VEND_CASH_SALE:
                self.logger.log_info("ENABLED")
                self.state = State.ENABLED
                self.send_frame(RSP_ACK)

            else:
                self.handle_the_unhandleable(frame)
                self.logger.log_error("Unknown VEND command!")

        elif cmd == CMD_READER:
            if full_cmd == CMD_READER_DISABLE:
                self.logger.log_info("DISABLED")
                self.state = State.DISABLED
                self.send_frame(RSP_ACK)

            elif full_cmd == CMD_READER_ENABLE:
                self.logger.log_info("ENABLED")
                self.state = State.ENABLED
                self.send_frame(RSP_ACK)

            elif full_cmd == CMD_READER_CANCEL:
                self.send_frame(RSP_CANCELLED)

            else:
                self.handle_the_unhandleable(frame)
                self.logger.log_error("Unknown VEND command!")

        elif cmd == CMD_EXPANSION:
            if full_cmd == CMD_EXPANSION_REQUEST_ID:
                self.send_frame(RSP_PERIPHERAL_ID)

            elif full_cmd == CMD_EXPANSION_DIAGNOSTICS:
                self.send_frame(RSP_DIAGNOSTICS)

            else:
                self.handle_the_unhandleable(frame)
                self.logger.log_error("Unknown EXPANSION command!")

        else:
            self.handle_the_unhandleable(frame)

    def handle_the_unhandleable(self, frame: bytes) -> None:
        """Handle unknown frames not defined in `../mdb_constants.py`.

        We handle these by logging them and then returning an error
        in the form of `RSP_CMD_OUT_OF_SEQ`.

        Parameters
        ----------
        frame
            The frame to handle.
        """
        self.logger.log_serial_in_err(frame, self.state, message="UNKNOWN FRAME!")
        self.send_frame(RSP_CMD_OUT_OF_SEQ)
