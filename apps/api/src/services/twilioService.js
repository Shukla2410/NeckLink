/**
 * Twilio SMS Dispatch Service for NECKLINK
 * Delivers urgent critical road closures, GLOF evacuation orders,
 * and geofence alerts to field responders' mobile phones via carrier SMS.
 */

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const fromNumber = process.env.TWILIO_FROM_NUMBER || "";

let client = null;
if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.warn("Twilio client initialization warning:", err.message);
  }
}

export async function sendSmsAlert(to, messageBody) {
  if (process.env.DISABLE_EXTERNAL_DELIVERY === "true")
    return {
      success: false,
      status: "DISABLED",
      message: "External delivery disabled",
    };
  if (!client) {
    return {
      success: false,
      status: "CONFIG_MISSING",
      message: "Twilio credentials not configured",
    };
  }

  // Format to standard E.164 (default to +91 if Indian number without country code)
  let cleanTo = String(to || "").trim();
  if (cleanTo.length === 10 && !cleanTo.startsWith("+")) {
    cleanTo = `+91${cleanTo}`;
  }

  const prefix = "[NECKLINK EMERGENCY ALERT] ";
  const fullBody = (
    messageBody.startsWith("[") ? messageBody : prefix + messageBody
  ).slice(0, 1600);

  try {
    const message = await client.messages.create({
      body: fullBody,
      from: fromNumber,
      to: cleanTo,
    });

    console.log(
      `[TWILIO SMS] Sent to ${cleanTo} | SID: ${message.sid} | Status: ${message.status}`,
    );

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: cleanTo,
      from: fromNumber,
      date_created: message.dateCreated,
    };
  } catch (err) {
    console.error(
      `[TWILIO SMS ERROR] Failed sending to ${cleanTo}:`,
      err.message,
    );

    // Provide friendly diagnostic for Twilio Trial restriction if recipient is unverified
    let hint = err.message;
    if (err.code === 21608) {
      hint =
        "Twilio Trial Mode: The destination phone number must be verified in the Twilio Console (https://console.twilio.com) before sending SMS.";
    }

    return {
      success: false,
      error_code: err.code,
      message: hint,
      original_error: err.message,
    };
  }
}

export async function getSmsDeliveryStatus(sid) {
  if (!client || process.env.DISABLE_EXTERNAL_DELIVERY === "true") return null;
  return (await client.messages(sid).fetch()).status;
}
