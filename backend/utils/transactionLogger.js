const fs = require("fs");
const path = require("path");

class TransactionLogger {
  constructor() {
    this.logFile = path.join(__dirname, "../logs/mpesa-transactions.json");
    this.ensureLogDirectory();
    this.initializeLogFile();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  initializeLogFile() {
    if (!fs.existsSync(this.logFile)) {
      const initialData = {
        metadata: {
          created: new Date().toISOString(),
          description: "M-Pesa Transaction Logs",
          version: "1.0",
        },
        transactions: [],
      };
      fs.writeFileSync(this.logFile, JSON.stringify(initialData, null, 2));
    }
  }

  logTransaction(type, data) {
    const logEntry = {
      id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: type, // 'STK_PUSH_INITIATED', 'CALLBACK_RECEIVED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED'
      data: data,
    };

    try {
      // Read current log file
      const logData = JSON.parse(fs.readFileSync(this.logFile, "utf8"));

      // Add new transaction
      logData.transactions.push(logEntry);

      // Update metadata
      logData.metadata.lastUpdated = new Date().toISOString();
      logData.metadata.totalTransactions = logData.transactions.length;

      // Write back to file
      fs.writeFileSync(this.logFile, JSON.stringify(logData, null, 2));

      console.log(`📝 Transaction logged: ${type} - ${logEntry.id}`);
      return logEntry.id;
    } catch (error) {
      console.error("❌ Error logging transaction:", error);
      return null;
    }
  }

  getTransactionLogs() {
    try {
      return JSON.parse(fs.readFileSync(this.logFile, "utf8"));
    } catch (error) {
      console.error("❌ Error reading transaction logs:", error);
      return null;
    }
  }

  getTransactionById(transactionId) {
    const logs = this.getTransactionLogs();
    if (!logs) return null;

    return logs.transactions.find((txn) => txn.id === transactionId);
  }

  getTransactionsByPhoneNumber(phoneNumber) {
    const logs = this.getTransactionLogs();
    if (!logs) return [];

    return logs.transactions.filter(
      (txn) =>
        txn.data.phoneNumber === phoneNumber ||
        txn.data.PhoneNumber === phoneNumber
    );
  }

  getTransactionsByStatus(status) {
    const logs = this.getTransactionLogs();
    if (!logs) return [];

    return logs.transactions.filter(
      (txn) => txn.data.status === status || txn.data.resultCode === status
    );
  }

  // Generate summary report
  generateSummary() {
    const logs = this.getTransactionLogs();
    if (!logs) return null;

    const summary = {
      totalTransactions: logs.transactions.length,
      byType: {},
      byStatus: {},
      byPhoneNumber: {},
      recentTransactions: logs.transactions.slice(-10),
      generatedAt: new Date().toISOString(),
    };

    logs.transactions.forEach((txn) => {
      // Count by type
      summary.byType[txn.type] = (summary.byType[txn.type] || 0) + 1;

      // Count by status
      const status = txn.data.status || txn.data.resultCode || "unknown";
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

      // Count by phone number
      const phone = txn.data.phoneNumber || txn.data.PhoneNumber;
      if (phone) {
        summary.byPhoneNumber[phone] = (summary.byPhoneNumber[phone] || 0) + 1;
      }
    });

    return summary;
  }
}

module.exports = TransactionLogger;
