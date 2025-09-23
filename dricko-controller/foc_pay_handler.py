import multiprocessing
from payments import PaymentCreditor
from mama_handler import MamaHandler
from dricko_handler import Dricko


if __name__ == "__main__":
    # establish communication queues
    incoming_payments_queue = multiprocessing.Queue(maxsize=1)
    payments_to_credit_queue = multiprocessing.Queue()
    credited_payments_queue = multiprocessing.Queue()

    payment_creditor = PaymentCreditor(payments_to_credit_queue, credited_payments_queue)
    payment_creditor.start()

    foc_pay_handler = MamaHandler(incoming_payments_queue, payments_to_credit_queue, credited_payments_queue)
    foc_pay_handler.start()

    dricko = Dricko()
    dricko.start()

