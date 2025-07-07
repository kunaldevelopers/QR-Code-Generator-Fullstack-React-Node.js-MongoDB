/**
 * Utility functions for formatting different QR code types
 */

const formatVCard = (data) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    organization,
    title,
    url,
    address,
  } = data;

  let vcard = "BEGIN:VCARD\nVERSION:3.0\n";
  vcard += `N:${lastName};${firstName};;;\n`;
  vcard += `FN:${firstName} ${lastName}\n`;

  if (organization) vcard += `ORG:${organization}\n`;
  if (title) vcard += `TITLE:${title}\n`;
  if (phone) vcard += `TEL;TYPE=WORK,VOICE:${phone}\n`;
  if (email) vcard += `EMAIL;TYPE=PREF,INTERNET:${email}\n`;
  if (url) vcard += `URL:${url}\n`;
  if (address) vcard += `ADR;TYPE=WORK,PREF:;;${address};;;;\n`;

  vcard += "END:VCARD";
  return vcard;
};

const formatWifi = (data) => {
  const { ssid, password, encryption, hidden } = data;
  let wifi = `WIFI:S:${ssid};`;

  if (encryption) wifi += `T:${encryption};`;
  if (password) wifi += `P:${password};`;
  if (hidden === true) wifi += "H:true;";

  wifi += ";";
  return wifi;
};

const formatEmail = (data) => {
  const { email, subject, body } = data;
  return `mailto:${email}?subject=${encodeURIComponent(
    subject || ""
  )}&body=${encodeURIComponent(body || "")}`;
};

const formatSMS = (data) => {
  const { phone, message } = data;
  return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
};

const formatGeo = (data) => {
  const { lat, lng } = data;
  return `geo:${lat},${lng}`;
};

const formatEvent = (data) => {
  const { summary, location, description, startDate, endDate } = data;

  let event = "BEGIN:VEVENT\n";
  if (summary) event += `SUMMARY:${summary}\n`;
  if (location) event += `LOCATION:${location}\n`;
  if (description) event += `DESCRIPTION:${description}\n`;
  if (startDate) event += `DTSTART:${formatICalDate(startDate)}\n`;
  if (endDate) event += `DTEND:${formatICalDate(endDate)}\n`;
  event += "END:VEVENT";

  return event;
};

// Helper function to format date for iCal
const formatICalDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

module.exports = {
  formatVCard,
  formatWifi,
  formatEmail,
  formatSMS,
  formatGeo,
  formatEvent,
};
