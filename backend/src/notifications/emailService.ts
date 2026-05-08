import nodemailer from "nodemailer";

const smtpConfig = {
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

export interface CaseEmailData {
  title: string;
  status: string | null;
  settlementAmount: string | null;
  detailUrl: string;
  deadline: string | null;
}

export async function sendNewCaseNotification(caseData: CaseEmailData) {
  const recipient = process.env.NOTIFICATION_EMAIL;
  if (!recipient) {
    console.warn("[EmailService] No NOTIFICATION_EMAIL set, skipping email.");
    return;
  }

  const subject = `[New Case] ${caseData.title}`;
  const html = `
    <h1>New Class Action Case Discovered</h1>
    <p><strong>Title:</strong> ${caseData.title}</p>
    <p><strong>Status:</strong> ${caseData.status || "N/A"}</p>
    <p><strong>Settlement Amount:</strong> ${caseData.settlementAmount || "N/A"}</p>
    <p><strong>Deadline:</strong> ${caseData.deadline || "N/A"}</p>
    <p><a href="${caseData.detailUrl}">View Case Details</a></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sentinel" <noreply@example.com>',
      to: recipient,
      subject,
      html,
    });
    console.log(`[EmailService] New case email sent for: ${caseData.title}`);
  } catch (err) {
    console.error("[EmailService] Error sending new case email:", err);
  }
}

export async function sendTrackedCaseUpdateNotification(
  caseData: CaseEmailData,
  changes: string[],
) {
  const recipient = process.env.NOTIFICATION_EMAIL;
  if (!recipient) {
    console.warn("[EmailService] No NOTIFICATION_EMAIL set, skipping email.");
    return;
  }

  const subject = `[Update] Tracked Case: ${caseData.title}`;
  const html = `
    <h1>Update to Tracked Case</h1>
    <p>A case you are tracking has been updated:</p>
    <p><strong>Title:</strong> ${caseData.title}</p>
    <ul>
      ${changes.map((change) => `<li>${change}</li>`).join("")}
    </ul>
    <p><strong>Current Status:</strong> ${caseData.status || "N/A"}</p>
    <p><strong>Current Deadline:</strong> ${caseData.deadline || "N/A"}</p>
    <p><a href="${caseData.detailUrl}">View Case Details</a></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sentinel" <noreply@example.com>',
      to: recipient,
      subject,
      html,
    });
    console.log(`[EmailService] Update email sent for: ${caseData.title}`);
  } catch (err) {
    console.error("[EmailService] Error sending update email:", err);
  }
}
