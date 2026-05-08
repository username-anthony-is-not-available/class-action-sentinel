import "dotenv/config";
import {
  sendNewCaseNotification,
  sendTrackedCaseUpdateNotification,
} from "./emailService.js";

async function testEmails() {
  console.log("Testing Email Notifications...");

  const testCase = {
    title: "Test Class Action vs. Example Corp",
    status: "Open for claims",
    settlementAmount: "$10,000,000",
    deadline: "2025-12-31",
    detailUrl: "https://example.com/case/test-case",
  };

  console.log("1. Sending New Case Notification...");
  await sendNewCaseNotification(testCase);

  console.log("2. Sending Tracked Case Update Notification...");
  const changes = [
    'Status changed from "Pending" to "Open for claims"',
    'Deadline changed from "N/A" to "2025-12-31"',
  ];
  await sendTrackedCaseUpdateNotification(testCase, changes);

  console.log("Test complete.");
}

testEmails().catch(console.error);
