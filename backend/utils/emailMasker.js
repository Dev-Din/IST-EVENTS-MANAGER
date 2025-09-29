/**
 * Email masking utility for hiding sensitive email information
 * Masks email addresses while keeping the first character and last character before @
 * Example: nurudiin222@gmail.com -> n**********2@gmail.com
 */

class EmailMasker {
  /**
   * Masks an email address for display purposes
   * @param {string} email - The email address to mask
   * @returns {string} - The masked email address
   */
  static maskEmail(email) {
    if (!email || typeof email !== "string") {
      return email;
    }

    // Split email into local part (before @) and domain part (after @)
    const [localPart, domain] = email.split("@");

    if (!localPart || !domain) {
      return email; // Return original if not a valid email format
    }

    // If local part is 1 or 2 characters, just show asterisks
    if (localPart.length <= 2) {
      return `${"*".repeat(localPart.length)}@${domain}`;
    }

    // Get first and last character of local part
    const firstChar = localPart[0];
    const lastChar = localPart[localPart.length - 1];

    // Create masked middle part
    const maskedMiddle = "*".repeat(localPart.length - 2);

    // Return masked email
    return `${firstChar}${maskedMiddle}${lastChar}@${domain}`;
  }

  /**
   * Masks multiple email addresses
   * @param {string[]} emails - Array of email addresses to mask
   * @returns {string[]} - Array of masked email addresses
   */
  static maskEmails(emails) {
    if (!Array.isArray(emails)) {
      return emails;
    }

    return emails.map((email) => this.maskEmail(email));
  }

  /**
   * Masks email in an object (useful for user objects)
   * @param {Object} obj - Object containing email field
   * @param {string} emailField - Name of the email field (default: 'email')
   * @returns {Object} - Object with masked email
   */
  static maskEmailInObject(obj, emailField = "email") {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    const maskedObj = { ...obj };

    if (maskedObj[emailField]) {
      maskedObj[emailField] = this.maskEmail(maskedObj[emailField]);
    }

    return maskedObj;
  }
}

module.exports = EmailMasker;
