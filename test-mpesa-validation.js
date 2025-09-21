// Test script to verify M-Pesa phone number validation
// This script tests the new 2547XXXXXXXX format requirement

console.log("Testing M-Pesa Phone Number Validation...");

// Test cases for M-Pesa validation
const testCases = [
  // Valid cases (should pass)
  {
    phone: "254712345678",
    expected: true,
    description: "Valid 2547XXXXXXXX format",
  },
  {
    phone: "254798765432",
    expected: true,
    description: "Valid 2547XXXXXXXX format",
  },
  {
    phone: "254700000000",
    expected: true,
    description: "Valid 2547XXXXXXXX format",
  },

  // Invalid cases (should fail)
  {
    phone: "254612345678",
    expected: false,
    description: "Invalid prefix 2546",
  },
  {
    phone: "254812345678",
    expected: false,
    description: "Invalid prefix 2548",
  },
  {
    phone: "25471234567",
    expected: false,
    description: "Too short (11 digits)",
  },
  {
    phone: "2547123456789",
    expected: false,
    description: "Too long (13 digits)",
  },
  { phone: "0712345678", expected: false, description: "Old format with 0" },
  { phone: "712345678", expected: false, description: "Missing country code" },
  { phone: "+254712345678", expected: false, description: "With + prefix" },
  { phone: "25471234567a", expected: false, description: "Contains letters" },
  { phone: "", expected: false, description: "Empty string" },
  { phone: "123456789012", expected: false, description: "Wrong country code" },
];

// Function to test phone number validation (matches frontend logic)
function validateMpesaPhone(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\s+/g, "");
  const mpesaPattern = /^2547\d{8}$/;
  return mpesaPattern.test(cleanPhone);
}

// Run tests
let passedTests = 0;
let totalTests = testCases.length;

console.log("\nRunning validation tests...\n");

testCases.forEach((testCase, index) => {
  const result = validateMpesaPhone(testCase.phone);
  const passed = result === testCase.expected;

  console.log(`Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Phone: "${testCase.phone}"`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`  Description: ${testCase.description}`);
  console.log("");

  if (passed) passedTests++;
});

console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log("🎉 All tests passed! M-Pesa validation is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please check the validation logic.");
}

// Additional test for regex pattern
console.log("\nTesting regex pattern directly...");
const mpesaPattern = /^2547\d{8}$/;
const testNumbers = [
  "254712345678",
  "254612345678",
  "25471234567",
  "2547123456789",
];

testNumbers.forEach((num) => {
  const matches = mpesaPattern.test(num);
  console.log(`${num}: ${matches ? "✅ Valid" : "❌ Invalid"}`);
});

console.log("\nM-Pesa Validation Test Complete");
