import logging
import os
import datetime
from binascii import hexlify
from typing import Any, Callable, Dict


from mdb_constants import (
    CMD_TO_HUMAN_READABLE_CMD,
    CMD_VEND_REQUEST,
    CMD_VEND_SUCCESS,
    RSP_TO_HUMAN_READABLE_RSP
)

class Logger():
    def __init__(self) -> None:
        logging.basicConfig(level=os.environ.get("LOGLEVEL", "INFO"))
        self.logger = logging.getLogger(__name__)
        # self.logger.setLevel(logging.INFO)

    def get_format(self, timestamps: bool) -> Callable[[Dict[Any, Any]], str]:
        fmt = "<level>{level: <7}</level> | <level>{message}</level>"

        if timestamps:
            fmt = "{time:MM-DD-YYYY - HH:mm:ss} | " + fmt

        def formatter(record: Dict[Any, Any]) -> str:
            if "important" in record["extra"]:
                final_fmt = "<bold>" + fmt + "</bold>"
            else:
                final_fmt = fmt
            return final_fmt + "\n{exception}"
        return formatter

    def log_debug(self, message: str) -> None:
        self.logger.debug(f'{self.get_time()} {message}')

    def log_info(self, message: str) -> None:
        self.logger.info(f'{self.get_time()} {message}')

    def log_warning(self, message: str) -> None:
        self.logger.warning(f'{self.get_time()} {message}')

    def log_error(self, message: str) -> None:
        self.logger.error(f'{self.get_time()} {message}')

    def hxlfy(self, binary: bytes) -> str:
        """Prettify binary blob.

        Prettify a binary blob by first converting it to a hexadecimal
        representation of the binary data, then converting it to a string
        and finally stripping and replacing some stuff.

        Parameters
        ----------
        binary
            The binary blob to turn into a pretty string.
        """
        return str(hexlify(binary)).strip("b").replace("'", "")

    def log_serial_in(self, cmd: bytes, state: Any) -> None:
        """Log serial communication received from the VMC.

        Parameters
        ----------
        cmd
            The command received from the VMC.
        """

        try:
            readable = CMD_TO_HUMAN_READABLE_CMD[cmd]
        except KeyError:
            readable = "UNKNOWN CMD"+str(cmd)
            if cmd[0:2] == CMD_VEND_REQUEST:
                readable = "VEND_REQUEST"
            elif cmd[0:2] == CMD_VEND_SUCCESS:
                readable = "VEND_SUCCESS"
            else:
                self.log_error(f"< {readable.ljust(25)} | {self.hxlfy(cmd).ljust(20)} | {state.name}")
                return
        self.log_debug(f"< {readable.ljust(25)} | {self.hxlfy(cmd).ljust(20)} | {state.name}")

    def log_serial_out(self, rsp: bytes, state: Any) -> None:
        """Log serial communication sent to the VMC.

        Parameters
        ----------
        rsp
            The response sent to the VMC.
        """
        readable = RSP_TO_HUMAN_READABLE_RSP[rsp]
        self.log_debug(f"> {readable.ljust(25)} | {self.hxlfy(rsp).ljust(20)} | {state.name}")

    def log_serial_in_err(self, cmd: bytes, state: Any, message: str) -> None:
        self.log_error(f"< {message.ljust(25)} | {self.hxlfy(cmd).ljust(20)} | {state.name}")
        

    def get_time(self):
        cur_time = datetime.datetime.now()
        strf_time = cur_time.strftime('%y-%m-%d, %H:%M:%S')
        return strf_time
        