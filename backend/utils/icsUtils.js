// backend/utils/icsUtils.js

export const formatDateToICS = (d) => {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
};

export const createICSStringForEvents = (events = []) => {
  // events: [{title, description, location, start:Date, end:Date}]
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SmartClass//Timetable//EN"];
  events.forEach((ev, idx) => {
    if (!ev.start) return;
    const uid = `smartclass-${idx}-${Date.now()}`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatDateToICS(new Date())}`);
    lines.push(`DTSTART:${formatDateToICS(ev.start)}`);
    if (ev.end) lines.push(`DTEND:${formatDateToICS(ev.end)}`);
    lines.push(`SUMMARY:${(ev.title || "").replace(/\n/g, "\\n")}`);
    if (ev.location) lines.push(`LOCATION:${(ev.location || "").replace(/\n/g, "\\n")}`);
    if (ev.description) lines.push(`DESCRIPTION:${(ev.description || "").replace(/\n/g, "\\n")}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};
