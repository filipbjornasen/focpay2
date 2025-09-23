###############################################################################
#                                                                             #
#                      Abrantix MDB Converter Constants                       #
#                                                                             #
###############################################################################

###############################################################################
# Control Bytes                                                               #
###############################################################################
AMC_STX = b"\x02"  # Designates the beginning of a frame.
AMC_ETX = b"\x03"  # Appears at the end of a frame.
AMC_EOT = b"\x04"  # Appears at the end of a transmission.
AMC_DLE = b"\x10"  # Uses to escape DLEs appearing in the payload and ETX.
AMC_ACK = b"\x06"  # Use to acknowledge the receipt of a complete frame.
AMC_NAK = b"\x15"  # Use to reject a frame.

###############################################################################
# Control Codes                                                               #
###############################################################################
AMC_DATA = b"\x00"  # Lets the AMC know that this is a pure data frame

###############################################################################
# Frame Layout                                                                #
###############################################################################
# format: 'STX Control-Code Data DLE ETX' is used on the link to the PC.
AMC_DATA_FRAME_START = AMC_STX + AMC_DATA
AMC_DATA_FRAME_END = AMC_DLE + AMC_ETX


###############################################################################
#                                                                             #
#                           MDB Protocol Constants                            #
#                                                                             #
###############################################################################

###############################################################################
# Commands                                                                    #
###############################################################################
CMD_RESET = b"\x10"  # Command for reader to self-reset.
CMD_RESET_FULL = b"\x10\x10"  # Command for reader to self-reset.

CMD_SETUP = b"\x11"  # Setup commands.
CMD_SETUP_CONFIG = b"\x11\x00"  # VMC's config + request for reader config
CMD_SETUP_CONFIG_FULL = b"\x11\x00\x02\x00\x00\x00"  # Level 2 VMC without display
CMD_SETUP_MAXMIN = b"\x11\x01"  # VMC's price range
CMD_SETUP_MAXMIN_FULL = b"\x11\x01\x00\x0a\x00\x0a"  # VMC's price range

CMD_POLL = b"\x12"  # Request for reader activity status.

CMD_VEND = b"\x13"  # Vend commands.
CMD_VEND_REQUEST = b"\x13\x00"  #
CMD_VEND_CANCEL = b"\x13\x01"  #
CMD_VEND_SUCCESS = b"\x13\x02"  #
CMD_VEND_FAILURE = b"\x13\x03"  #
CMD_VEND_SESSION_COMPLETE = b"\x13\x04"  #
CMD_VEND_CASH_SALE = b"\x13\x05"  #

CMD_READER = b"\x14"  # Reader commands
CMD_READER_DISABLE = b"\x14\x00"  #
CMD_READER_ENABLE = b"\x14\x01"  #
CMD_READER_CANCEL = b"\x14\x02"  #

CMD_EXPANSION = b"\x17"  # Expansion commands
CMD_EXPANSION_REQUEST_ID = b"\x17\x00"  #
CMD_EXPANSION_DIAGNOSTICS = b"\x17\xFF"  #

ALL_COMMANDS = [CMD_RESET, CMD_SETUP, CMD_POLL, CMD_VEND, CMD_READER, CMD_EXPANSION]

CMD_TO_HUMAN_READABLE_CMD = {
    CMD_RESET: "RESET",
    CMD_RESET_FULL: "RESET",
    CMD_SETUP: "SETUP",
    CMD_SETUP_CONFIG: "SETUP_CONFIG",
    CMD_SETUP_CONFIG_FULL: "SETUP_CONFIG",
    CMD_SETUP_MAXMIN: "SETUP_MAXMIN",
    CMD_SETUP_MAXMIN_FULL: "SETUP_MAXMIN",
    CMD_POLL: "POLL",
    CMD_VEND: "VEND",
    CMD_VEND_REQUEST: "VEND_REQUEST",
    CMD_VEND_CANCEL: "VEND_CANCEL",
    CMD_VEND_SUCCESS: "VEND_SUCCESS",
    CMD_VEND_FAILURE: "VEND_FAILURE",
    CMD_VEND_SESSION_COMPLETE: "VEND_SESSION_COMPLETE",
    CMD_VEND_CASH_SALE: "VEND_CASH_SALE",
    CMD_READER: "READER",
    CMD_READER_DISABLE: "READER_DISABLE",
    CMD_READER_ENABLE: "READER_ENABLE",
    CMD_READER_CANCEL: "READER_CANCEL",
    CMD_EXPANSION: "EXPANSION",
    CMD_EXPANSION_REQUEST_ID: "EXPANSION_REQUEST_ID",
    CMD_EXPANSION_DIAGNOSTICS: "EXPANSION_DIAGNOSTICS",
}

###############################################################################
# Responses                                                                   #
###############################################################################
RSP_ACK = b""

RSP_JUST_RESET = b"\x00"

# Reader Config Data - 8 bytes
# Z1 - Reader Config Data       01H -> We are responding to a setup command
# Z2 - Reader Feature Level:    01H -> Level 1
# Z3 - Country/Currency Code:   17H -> Sweden
# Z4 - Country/Currency Code:   52H -> Sweden
# Z5 - Monetary Scaling Factor: 01H -> We only deal in whole kronors (for now)
# Z6 - Decimal Places:          02H -> 2 Decimal Places for SEK
# Z7 - App Max Response Time:   02H -> 2 seconds
# Z8 - Misc. options:           00H -> No misc. options set
#
#                        Z1  Z2  Z3  Z4  Z5  Z6  Z7  Z8
RSP_SETUP_CONFIG = b"\x01\x01\x17\x52\x01\x02\x02\x00"

# Begin Session - 3 bytes
# Z1 - Begin Session            03H -> Allow patron to make a selection, but do not dispense product until funds are approved
# Z2 - Funds Available:         FFH -> Not yet determined. Allows selection without displaying balance
# Z3 - Funds Available:         FFH -> Not yet determined. Allows selection without displaying balance
#
#                        Z1  Z2  Z3
RSP_BEGIN_SESSION = b"\x03\xFF\xFF"

RSP_SESSION_CANCEL = b"\x04"

# Vend Approved - 3 bytes
# Z1 - Vend Approved            05H -> Allow the selected product to be dispensed
# Z2 - Vend Amount:             FFH -> An electric token was used
# Z3 - Vend Amount:             FFH -> An electric token was used
#
#                        Z1  Z2  Z3
RSP_VEND_APPROVED = b"\x05\xFF\xFF"

RSP_VEND_DENIED = b"\x06"

RSP_END_SESSION = b"\x07"

RSP_CANCELLED = b"\x08"

#                        Z1  Z2-Z30 unknown
RSP_PERIPHERAL_ID = b"\x09\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"

RSP_ERROR = b"\x0A\x30"

RSP_CMD_OUT_OF_SEQ = b"\x0B"

RSP_DIAGNOSTICS = b"\xFF\x00"

ALL_RESPONSES = [
    RSP_ACK,
    RSP_JUST_RESET,
    RSP_SETUP_CONFIG,
    RSP_BEGIN_SESSION,
    RSP_SESSION_CANCEL,
    RSP_VEND_APPROVED,
    RSP_VEND_DENIED,
    RSP_END_SESSION,
    RSP_CANCELLED,
    RSP_PERIPHERAL_ID,
    RSP_ERROR,
    RSP_CMD_OUT_OF_SEQ,
    RSP_DIAGNOSTICS,
]

RSP_TO_HUMAN_READABLE_RSP = {
    RSP_ACK: "ACK",
    RSP_JUST_RESET: "JUST_RESET",
    RSP_SETUP_CONFIG: "SETUP_CONFIG",
    RSP_BEGIN_SESSION: "BEGIN_SESSION",
    RSP_SESSION_CANCEL: "SESSION_CANCEL",
    RSP_VEND_APPROVED: "VEND_APPROVED",
    RSP_VEND_DENIED: "VEND_DENIED",
    RSP_END_SESSION: "END_SESSION",
    RSP_CANCELLED: "CANCELLED",
    RSP_PERIPHERAL_ID: "PERIPHERAL_ID",
    RSP_ERROR: "ERROR",
    RSP_CMD_OUT_OF_SEQ: "CMD_OUT_OF_SEQ",
    RSP_DIAGNOSTICS: "DIAGNOSTICS",
}
