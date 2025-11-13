const dotenv = require("dotenv");

dotenv.config();

jest.setTimeout(20000);

const requiredEnv = [
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_SHORTCODE",
  "MPESA_PASSKEY",
  "MPESA_CALLBACK_URL",
];

describe("M-Pesa Sandbox Connectivity", () => {
  let mpesaService;
  const missing = requiredEnv.filter((key) => !process.env[key]);

  beforeAll(() => {
    if (missing.length > 0) {
      throw new Error(
        `Missing required M-Pesa sandbox environment variables: ${missing.join(
          ", "
        )}`
      );
    }

    // Require the service only after verifying configuration
    mpesaService = require("../utils/mpesaService");
  });

  test("service should become ready with sandbox credentials", async () => {
    const ready = await mpesaService.waitForReady(20000);
    expect(ready).toBe(true);
    expect(mpesaService.isReady()).toBe(true);
  });

  test("should retrieve a valid sandbox access token", async () => {
    const token = await mpesaService.getAccessToken(0, true);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  test("sandbox connection check should succeed", async () => {
    const result = await mpesaService.testConnection();
    expect(result.success).toBe(true);
    expect(result.token).toBe("Valid");
  });
});

