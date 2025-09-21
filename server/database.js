const { TableClient } = require("@azure/data-tables");

class PaymentDatabase {
    constructor() {
        this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.tableName = "payments";
        this.tableClient = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        if (!this.connectionString) {
            throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
        }

        this.tableClient = TableClient.fromConnectionString(this.connectionString, this.tableName);

        try {
            await this.tableClient.createTable();
        } catch (error) {
            if (error.statusCode !== 409) {
                throw error;
            }
        }

        this.initialized = true;
    }

    async createPayment(paymentData) {
        await this.initialize();

        const entity = {
            partitionKey: "payment",
            rowKey: paymentData.id,
            id: paymentData.id,
            token: paymentData.token || "",
            status: "CREATED",
            amount: paymentData.amount,
            currency: paymentData.currency || "SEK",
            message: paymentData.message || "",
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
            payerAlias: paymentData.payerAlias || "",
            payeeAlias: paymentData.payeeAlias || "",
            callbackUrl: paymentData.callbackUrl || "",
            errorCode: paymentData.errorCode || "",
            errorMessage: paymentData.errorMessage || "",
            datePaid: paymentData.datePaid || ""
        };

        try {
            await this.tableClient.createEntity(entity);
            return entity;
        } catch (error) {
            throw new Error(`Failed to create payment: ${error.message}`);
        }
    }

    async updatePaymentStatus(paymentId, newStatus, additionalData = {}) {
        await this.initialize();

        const validStatuses = ["CREATED", "PAID", "DECLINED", "ERROR", "CANCELLED", "CREDITED"];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(", ")}`);
        }

        try {
            const entity = await this.tableClient.getEntity("payment", paymentId);

            entity.status = newStatus;
            entity.dateUpdated = new Date().toISOString();

            if (additionalData.payerAlias) entity.payerAlias = additionalData.payerAlias;
            if (additionalData.datePaid) entity.datePaid = additionalData.datePaid;
            if (additionalData.errorCode) entity.errorCode = additionalData.errorCode;
            if (additionalData.errorMessage) entity.errorMessage = additionalData.errorMessage;

            await this.tableClient.updateEntity(entity, "Replace");
            return entity;
        } catch (error) {
            if (error.statusCode === 404) {
                throw new Error(`Payment with ID ${paymentId} not found`);
            }
            throw new Error(`Failed to update payment status: ${error.message}`);
        }
    }

    async getOldestPaidPayment() {
        await this.initialize();

        try {
            const filter = "PartitionKey eq 'payment' and status eq 'PAID'";
            const entities = this.tableClient.listEntities({ queryOptions: { filter } });

            let oldestPayment = null;
            let oldestDate = null;

            for await (const entity of entities) {
                const paidDate = new Date(entity.datePaid || entity.dateUpdated);
                if (!oldestDate || paidDate < oldestDate) {
                    oldestDate = paidDate;
                    oldestPayment = entity;
                }
            }

            return oldestPayment;
        } catch (error) {
            throw new Error(`Failed to get oldest paid payment: ${error.message}`);
        }
    }

    async getPayment(paymentId) {
        await this.initialize();

        try {
            const entity = await this.tableClient.getEntity("payment", paymentId);
            return entity;
        } catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            throw new Error(`Failed to get payment: ${error.message}`);
        }
    }

    async getAllPayments() {
        await this.initialize();

        try {
            const filter = "PartitionKey eq 'payment'";
            const entities = this.tableClient.listEntities({ queryOptions: { filter } });

            const payments = [];
            for await (const entity of entities) {
                payments.push(entity);
            }

            return payments;
        } catch (error) {
            throw new Error(`Failed to get all payments: ${error.message}`);
        }
    }
}

const paymentDb = new PaymentDatabase();

module.exports = {
    PaymentDatabase,
    paymentDb
};