const BLOCKED_DOMAINS = [
  "10minutemail.com",
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "maildrop.cc",
  "throwawaymail.com",
  "sharklasers.com",
  "fakeinbox.com",
  "trashmail.com",
  "dispostable.com",
  "getnada.com",
  "emailondeck.com",
  "moakt.com",
];

export function isDisposableEmail(email: string): boolean {
  const domain = email
    .trim()
    .toLowerCase()
    .split("@")[1];

  if (!domain) {
    return true;
  }

  return BLOCKED_DOMAINS.includes(domain);
}