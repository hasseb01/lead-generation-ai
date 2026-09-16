import dns from "node:dns/promises";
import net from "node:net";

/** Real deliverability check, unlike SaaSquatch's own Validators tool (tested live: it
 * flagged a real, actively-used Gmail inbox as "Invalid" with no reasoning shown — it
 * appears to check against a stale internal DB rather than verifying anything live).
 * Pipeline: syntax -> DNS MX -> SMTP RCPT TO probe -> disposable/role/catch-all heuristics.
 * SMTP/MX steps degrade to "unknown" (never a false "invalid") when a step can't complete,
 * e.g. outbound port 25 blocked by the hosting network — common in serverless environments. */

export type EmailCheckResult = {
  email: string;
  status: "valid" | "invalid" | "risky" | "unknown";
  reason: string;
  syntaxValid: boolean;
  mxFound: boolean;
  smtpDeliverable: boolean | null;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isCatchAll: boolean | null;
};

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Small bundled sample of common disposable-email domains — not exhaustive, but catches
// the most common throwaway providers used to game lead-gen forms.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "throwawaymail.com", "yopmail.com", "trashmail.com", "getnada.com",
  "fakeinbox.com", "temp-mail.org", "dispostable.com", "maildrop.cc",
]);

const ROLE_PREFIXES = new Set([
  "admin", "administrator", "support", "info", "contact", "sales", "hello",
  "help", "billing", "noreply", "no-reply", "postmaster", "webmaster", "abuse",
]);

export const GENERIC_PREFIXES = ["info", "contact", "sales", "hello", "support"];

function splitEmail(email: string): { local: string; domain: string } | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return { local: email.slice(0, at).toLowerCase(), domain: email.slice(at + 1).toLowerCase() };
}

async function findMxHost(domain: string): Promise<string | null> {
  try {
    const records = await dns.resolveMx(domain);
    if (records.length === 0) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0].exchange;
  } catch {
    return null;
  }
}

/** Connects to the MX host and issues a RCPT TO without sending mail (QUIT before DATA).
 * Returns null (not false) when the probe itself fails/times out, so a blocked outbound
 * port never gets reported as a confident "invalid". */
function smtpProbe(mxHost: string, email: string, heloDomain: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: mxHost, port: 25, timeout: 6000 });
    let step = 0;
    let settled = false;
    const finish = (result: boolean | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.on("timeout", () => finish(null));
    socket.on("error", () => finish(null));

    socket.on("data", (buf) => {
      const line = buf.toString();
      const code = parseInt(line.slice(0, 3), 10);
      if (step === 0) {
        if (code !== 220) return finish(null);
        socket.write(`HELO ${heloDomain}\r\n`);
        step = 1;
      } else if (step === 1) {
        if (code !== 250) return finish(null);
        socket.write(`MAIL FROM:<verify@${heloDomain}>\r\n`);
        step = 2;
      } else if (step === 2) {
        if (code !== 250) return finish(null);
        socket.write(`RCPT TO:<${email}>\r\n`);
        step = 3;
      } else if (step === 3) {
        socket.write("QUIT\r\n");
        // 250/251 = accepted, 550/551/553 = rejected, anything else = ambiguous
        if (code === 250 || code === 251) return finish(true);
        if (code >= 550 && code < 560) return finish(false);
        return finish(null);
      }
    });
  });
}

export async function verifyEmail(rawEmail: string): Promise<EmailCheckResult> {
  const email = rawEmail.trim().toLowerCase();
  const syntaxValid = EMAIL_RE.test(email);
  const parts = splitEmail(email);

  if (!syntaxValid || !parts) {
    return {
      email, status: "invalid", reason: "Malformed email address",
      syntaxValid: false, mxFound: false, smtpDeliverable: null,
      isDisposable: false, isRoleAccount: false, isCatchAll: null,
    };
  }

  const { local, domain } = parts;
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const isRoleAccount = ROLE_PREFIXES.has(local);

  if (isDisposable) {
    return {
      email, status: "invalid", reason: "Disposable/throwaway email provider",
      syntaxValid: true, mxFound: false, smtpDeliverable: null,
      isDisposable: true, isRoleAccount, isCatchAll: null,
    };
  }

  const mxHost = await findMxHost(domain);
  if (!mxHost) {
    return {
      email, status: "invalid", reason: "Domain has no mail server (no MX record)",
      syntaxValid: true, mxFound: false, smtpDeliverable: null,
      isDisposable: false, isRoleAccount, isCatchAll: null,
    };
  }

  const heloDomain = process.env.SMTP_HELO_DOMAIN || "example.com";
  const smtpDeliverable = await smtpProbe(mxHost, email, heloDomain);

  let isCatchAll: boolean | null = null;
  if (smtpDeliverable === true) {
    const probeLocal = `nonexistent-probe-${Date.now()}`;
    isCatchAll = await smtpProbe(mxHost, `${probeLocal}@${domain}`, heloDomain);
  }

  if (smtpDeliverable === false) {
    return {
      email, status: "invalid", reason: "Mail server rejected the address (mailbox doesn't exist)",
      syntaxValid: true, mxFound: true, smtpDeliverable: false,
      isDisposable: false, isRoleAccount, isCatchAll: null,
    };
  }

  if (smtpDeliverable === null) {
    return {
      email, status: "unknown",
      reason: "MX found but the mail server didn't respond to a live probe (often blocked outbound SMTP) — format and domain are valid",
      syntaxValid: true, mxFound: true, smtpDeliverable: null,
      isDisposable: false, isRoleAccount, isCatchAll: null,
    };
  }

  if (isCatchAll) {
    return {
      email, status: "risky",
      reason: "Domain accepts mail for any address (catch-all) — can't confirm this specific mailbox exists",
      syntaxValid: true, mxFound: true, smtpDeliverable: true,
      isDisposable: false, isRoleAccount, isCatchAll: true,
    };
  }

  return {
    email, status: "valid", reason: "Syntax valid, MX found, mailbox confirmed deliverable",
    syntaxValid: true, mxFound: true, smtpDeliverable: true,
    isDisposable: false, isRoleAccount, isCatchAll: false,
  };
}

/** Ranks which generic role-based prefix (info@, sales@, etc.) is most likely to be
 * monitored for a company, using its category as a weak signal. Falls back to a fixed
 * priority order when no OpenAI key is configured — mirrors the fallback pattern in
 * scoring.ts so the app degrades gracefully rather than failing. */
export async function rankGenericPrefixes(category: string | null): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY || !category) return GENERIC_PREFIXES;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `A company's category is "${category}". Rank these generic email prefixes by how likely a real person monitors that inbox for B2B outreach, most likely first: ${GENERIC_PREFIXES.join(", ")}. Reply with only the comma-separated list, reordered, no explanation.`,
          },
        ],
        temperature: 0,
      }),
    });
    if (!res.ok) return GENERIC_PREFIXES;
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const ranked = data.choices[0].message.content
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => GENERIC_PREFIXES.includes(s));
    const missing = GENERIC_PREFIXES.filter((p) => !ranked.includes(p));
    return ranked.length > 0 ? [...ranked, ...missing] : GENERIC_PREFIXES;
  } catch {
    return GENERIC_PREFIXES;
  }
}
