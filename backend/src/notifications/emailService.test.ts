import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendNewCaseNotification, sendTrackedCaseUpdateNotification } from "./emailService.js";
import nodemailer from "nodemailer";

vi.mock("nodemailer", () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: sendMailMock,
      }),
    },
  };
});

describe("emailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("sendNewCaseNotification", () => {
    it("should skip sending email if NOTIFICATION_EMAIL is not set", async () => {
      delete process.env.NOTIFICATION_EMAIL;
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await sendNewCaseNotification({
        title: "Test Case",
        status: "Open",
        settlementAmount: "$1M",
        detailUrl: "http://example.com",
        deadline: "2025-12-31",
      });

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No NOTIFICATION_EMAIL set")
      );
      consoleWarnSpy.mockRestore();
    });

    it("should send email if NOTIFICATION_EMAIL is set", async () => {
      process.env.NOTIFICATION_EMAIL = "test@example.com";
      process.env.SMTP_FROM = '"Sentinel" <noreply@example.com>';

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await sendNewCaseNotification({
        title: "Test Case",
        status: "Open",
        settlementAmount: "$1M",
        detailUrl: "http://example.com",
        deadline: "2025-12-31",
      });

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: '"Sentinel" <noreply@example.com>',
        to: "test@example.com",
        subject: "[New Case] Test Case",
        html: expect.stringContaining("Test Case"),
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("New case email sent for: Test Case")
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe("sendTrackedCaseUpdateNotification", () => {
    it("should skip sending email if NOTIFICATION_EMAIL is not set", async () => {
      delete process.env.NOTIFICATION_EMAIL;
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await sendTrackedCaseUpdateNotification(
        {
          title: "Test Case",
          status: "Closed",
          settlementAmount: "$2M",
          detailUrl: "http://example.com",
          deadline: "2026-01-01",
        },
        ["Status changed"]
      );

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should send email with changes if NOTIFICATION_EMAIL is set", async () => {
      process.env.NOTIFICATION_EMAIL = "test@example.com";
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await sendTrackedCaseUpdateNotification(
        {
          title: "Test Case",
          status: "Closed",
          settlementAmount: "$2M",
          detailUrl: "http://example.com",
          deadline: "2026-01-01",
        },
        ["Status changed from Open to Closed", "Deadline changed"]
      );

      const transporter = nodemailer.createTransport();
      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: '"Sentinel" <noreply@example.com>',
        to: "test@example.com",
        subject: "[Update] Tracked Case: Test Case",
        html: expect.stringContaining("Status changed from Open to Closed"),
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Update email sent for: Test Case")
      );
      consoleLogSpy.mockRestore();
    });
  });
});