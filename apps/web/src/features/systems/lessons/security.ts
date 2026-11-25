import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ----------------------------------------- Authentication ----------------------------------------- */

const priya = node("priya", "browser", "Priya", -4, 0);
const auth = node("auth", "service", "Login service", -0.8, 0);
const users = node("users", "db", "Users table", 2.4, 0);
const attacker = node("attacker", "user", "Attacker", -4, 2.6, { hue: "rose" });
const login = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [priya, auth, users].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [both("priya", "auth", 1), both("auth", "users", 1)],
});

export const AUTHENTICATION: Lesson = {
  id: "authentication",
  title: "Authentication",
  tagline: "Proving who someone is, without becoming the reason their password leaks.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "Storing passwords as slow, salted hashes",
    "Sessions and cookies after login",
    "Credential stuffing and how to blunt it",
    "Second factors, phishing and passkeys",
    '"Sign in with…" and stolen tokens',
  ],
  builtOn: [{ label: "Hash set", path: "/structures/hash-set" }],
  steps: [
    {
      kind: "problem",
      short: "Plain text",
      title: "A table full of passwords",
      body: [
        "The first login service stored passwords exactly as typed, and logging in was a simple comparison. Then a database backup leaked from a misconfigured bucket.",
        "Every learner's password is now readable, and many people reuse passwords, so their email and bank accounts are at risk too.",
      ],
      callout: {
        kind: "watch",
        text: "Never store a password itself, anywhere: not in the table, logs or backups.",
      },
      scene: {
        nodes: [priya, auth, { ...users, badge: "hunter2, iloveyou…", state: "hot" }, attacker],
        links: [
          both("priya", "auth", 1),
          both("auth", "users", 1),
          link("users", "attacker", "heavy"),
        ],
      },
    },
    {
      kind: "solution",
      short: "Hash",
      title: "Store a slow, salted hash",
      body: [
        "Store a **hash**: a one-way fingerprint. At login, hash what Priya typed and compare fingerprints. Use a hash built for passwords (argon2id, bcrypt, scrypt): deliberately slow, so guessing billions of passwords is expensive.",
        "Add a random **salt** per learner, stored with the hash, so two people with the same password get different hashes and precomputed tables are useless.",
      ],
      code: [
        "stored = argon2id(password, salt=random_bytes(16))",
        "ok = argon2id(typed, salt=row.salt) == row.hash",
      ],
      quiz: {
        question: "Why a different salt for every learner?",
        options: [
          "To make hashing faster",
          "So identical passwords don't share a hash, and one cracked hash doesn't crack the rest",
          "Because the hash must be reversible",
        ],
        answer: 1,
        why: "Without salts, an attacker cracks one common password and instantly knows everyone who used it.",
      },
      scene: login({ users: { badge: "argon2id + salt" } }),
    },
    {
      kind: "technique",
      short: "Sessions",
      title: "After login: a session",
      body: [
        "Nobody wants to type a password on every click. After a successful login the service creates a **session** and gives the browser a long random session id in a cookie.",
        "Mark the cookie `HttpOnly` (scripts can't read it), `Secure` (HTTPS only) and `SameSite` (not sent by other sites' forms).",
      ],
      code: ["Set-Cookie: sid=Kq2…9f; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600"],
      scene: login({ priya: { sub: "cookie: sid=Kq2…" } }),
    },
    {
      kind: "case",
      short: "Reset",
      title: "Case: the forgotten-password flow",
      body: [
        'Password reset is a second door into every account, and often the weakest. Common bugs: guessable reset tokens, tokens that never expire, and a form that says "no account with that email", telling an attacker who is registered.',
        'Use long random single-use tokens that expire in minutes, and always answer "if that email exists, we sent a link".',
      ],
      scene: login({ auth: { badge: "token: 15 min, once" } }),
    },
    {
      kind: "problem",
      short: "Stuffing",
      title: "Credential stuffing",
      body: [
        "A bot has a list of a billion email + password pairs leaked from other sites. It tries them against AlgoVerse's login form, thousands per second.",
        "Your hashing is perfect, but some learners reused a leaked password, and for them the bot simply logs in.",
      ],
      metrics: [
        { label: "Login attempts", value: "6,000 /s", tone: "bad" },
        { label: "Successful", value: "0.4%", tone: "bad" },
      ],
      scene: {
        nodes: [priya, attacker, { ...auth, state: "hot" }, users],
        links: [
          both("priya", "auth", 1),
          link("attacker", "auth", { kind: "request", rate: 4 }, { kind: "fail", rate: 2 }),
          both("auth", "users", 2),
        ],
      },
    },
    {
      kind: "solution",
      short: "Defend",
      title: "Make guessing expensive",
      body: [
        "Defend the form itself: rate-limit attempts per account and per IP address, add a challenge when traffic looks automated, and reject passwords that appear in known breach lists.",
        "Notify learners of sign-ins from new devices, so they can react.",
      ],
      scene: {
        nodes: [priya, attacker, { ...auth, badge: "rate limits" }, users],
        links: [
          both("priya", "auth", 1),
          link("attacker", "auth", "request", { kind: "fail", back: true, rate: 3 }),
          both("auth", "users", 1),
        ],
      },
    },
    {
      kind: "solution",
      short: "MFA",
      title: "A second factor",
      body: [
        "**Multi-factor authentication** asks for something you have as well as something you know: a code from an authenticator app, a push approval, or a hardware key.",
        "A stuffed password alone no longer opens the account.",
      ],
      scene: login({ priya: { sub: "+ code from phone" }, auth: { badge: "MFA" } }),
    },
    {
      kind: "case",
      short: "Phishing",
      title: "Case: a perfect fake login page",
      body: [
        'An email warns of "unusual activity" and links to `algoverse-login.co`, a pixel-perfect copy. Priya types her password and the one-time code; the fake site relays both to the real one within seconds.',
        "Codes typed by humans can be phished. **Passkeys** (WebAuthn) can't: the device signs a challenge, and the signature only works for the real site's domain.",
      ],
      callout: {
        kind: "key",
        text: "Passkeys: nothing to type, nothing to steal, and bound to the right website.",
      },
      scene: {
        nodes: [
          priya,
          node("fake", "server", "Fake site", -0.8, -2.4, {
            hue: "rose",
            badge: "algoverse-login.co",
          }),
          auth,
          users,
        ],
        links: [
          link("priya", "fake", "request"),
          link("fake", "auth", "request"),
          both("auth", "users", 1),
        ],
      },
    },
    {
      kind: "technique",
      short: "Sign in with",
      title: "Or let an identity provider do it",
      body: [
        '"Sign in with GitHub" uses **OpenID Connect** (built on OAuth 2.0). AlgoVerse sends Priya to the identity provider; she proves who she is there, and the provider sends back a signed **ID token** saying who she is.',
        "AlgoVerse never sees her password, and inherits the provider's MFA and breach protection.",
      ],
      scene: {
        nodes: [
          priya,
          auth,
          users,
          node("idp", "lock", "Identity provider", -0.8, -2.6, { sub: "GitHub, Google…" }),
        ],
        links: [both("priya", "idp", 1), link("idp", "auth", "event"), both("auth", "users", 1)],
      },
    },
    {
      kind: "case",
      short: "Stolen token",
      title: "Case: a stolen token",
      body: [
        "A bug logs request headers, and someone finds Priya's access token in the logs. A token is as good as a password while it is valid; if it never expires, the attacker is Priya forever.",
        "Keep access tokens short-lived (minutes), refresh them with a separate token that can be **revoked**, and never log secrets.",
      ],
      scene: {
        nodes: [priya, auth, users, { ...attacker, badge: "has token" }],
        links: [both("priya", "auth", 1), link("attacker", "auth", "request")],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Store passwords as slow, salted hashes (argon2id, bcrypt).",
        "Sessions in HttpOnly, Secure cookies, or short-lived tokens.",
        "Blunt stuffing with rate limits, breach checks and MFA.",
        "Passkeys resist phishing; identity providers can do the heavy lifting.",
      ],
      scene: login(),
    },
  ],
};

/* ----------------------------------------- Authorization ----------------------------------------- */

const teacher = node("teacher", "browser", "Mr Rao", -4, 0, { sub: "Hillview School" });
const api = node("api", "server", "Classroom API", -0.8, 0);
const grades = node("grades", "db", "Grades", 2.4, 0, { sub: "all schools" });
const policy = node("policy", "lock", "Policy service", -0.8, -2.6, { sub: "who may do what" });
const authz = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [teacher, api, grades].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [both("teacher", "api", 1), both("api", "grades", 1)],
});

export const AUTHORIZATION: Lesson = {
  id: "authorization",
  title: "Authorization",
  tagline:
    "Knowing who someone is doesn't tell you what they may see or do. Checking that, everywhere.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Checking ownership on every request",
    "Mass assignment and row-level security",
    "Roles and relationships",
    "Central policies and least privilege",
    "Acting as the user, and audit logs",
  ],
  steps: [
    {
      kind: "problem",
      short: "Not allowed",
      title: "Logged in is not the same as allowed",
      body: [
        "Mr Rao, a teacher at Hillview School, opens his class's grades at `/classrooms/1042/grades`. He changes the number to 1043 and sees the grades of a class at another school.",
        "The API checked that he was logged in, but never checked that classroom 1043 is his. This bug is called an **insecure direct object reference**.",
      ],
      scene: authz({ grades: { badge: "class 1043: other school!", state: "hot" } }),
    },
    {
      kind: "solution",
      short: "Ownership",
      title: "Check ownership on every request",
      body: [
        "Every lookup must be scoped to who is asking: fetch classroom 1043 **only if** it belongs to the caller's school. For Mr Rao that finds nothing, and he gets 404 Not Found, which doesn't even confirm it exists.",
      ],
      code: [
        "SELECT * FROM grades",
        "WHERE classroom_id = 1043",
        "  AND school_id = :callers_school   -- never optional",
      ],
      scene: authz({ api: { badge: "scoped to Hillview" } }),
    },
    {
      kind: "case",
      short: "Mass assign",
      title: 'Case: "role": "admin"',
      body: [
        'A learner edits her own profile, which is allowed. But the API saves every field in the JSON body, so she adds `"role": "admin"` and promotes herself.',
        "Accept only the fields a user may change (an allow-list), never the whole object.",
      ],
      scene: authz({
        teacher: { label: "A learner", sub: "role: admin?!" },
        grades: { label: "Users" },
      }),
    },
    {
      kind: "technique",
      short: "Row security",
      title: "Let the database enforce it too",
      body: [
        "Ownership checks live in application code, so one query that forgets `AND school_id = …` brings the leak back.",
        "Add a second layer: **row-level security** in the database. Each connection says which school it acts for, and the database itself hides every other school's rows.",
      ],
      scene: authz({ grades: { badge: "row-level security" } }),
    },
    {
      kind: "technique",
      short: "Roles",
      title: "Roles: what each kind of user may do",
      body: [
        "Inside a school, people need different powers: students see their own grades, teachers edit grades for their classes, a principal sees reports for the whole school.",
        "Rather than listing permissions per person, group them into **roles** and give people roles.",
      ],
      table: {
        head: ["Role", "May"],
        rows: [
          ["Student", "see own grades, submit work"],
          ["Teacher", "edit grades in own classes"],
          ["Principal", "read all reports in the school"],
        ],
      },
      scene: authz(),
    },
    {
      kind: "technique",
      short: "Relations",
      title: "Relationships: sharing and study groups",
      body: [
        'Roles struggle with sharing: "Priya may see this solution because it was shared with her study group".',
        '**Relationship-based access** stores facts like "solution 88 is in group G" and "Priya is a member of G", and answers "can Priya view solution 88?" by following the links.',
      ],
      scene: authz(),
    },
    {
      kind: "technique",
      short: "Policy",
      title: "Decide in one place",
      body: [
        'Permission checks scattered as if-statements across twenty services drift apart, and nobody can answer "who can edit grades?".',
        'Instead each service asks a **policy service** ("may Mr Rao edit grades for class 1042?") and enforces the answer. The rules live, and are reviewed, in one place.',
      ],
      scene: {
        nodes: [teacher, api, grades, policy],
        links: [both("teacher", "api", 1), both("api", "policy", 1), both("api", "grades", 1)],
      },
    },
    {
      kind: "case",
      short: "Least power",
      title: "Case: a service with keys to everything",
      body: [
        "The reports service connects to the database as the admin account, because that was quickest. Then a SQL-injection bug is found in a report filter, and the attacker can read, and delete, everything.",
        "**Least privilege**: give every service and every person only the access its job needs. The reports service gets a read-only account that sees one reporting view.",
      ],
      scene: authz({ api: { label: "Reports service", badge: "DB admin!", state: "hot" } }),
    },
    {
      kind: "technique",
      short: "As the user",
      title: "Act as the user, and keep an audit log",
      body: [
        "When an API hands work to another service, pass the **user's** identity along, so the second service runs the query with the user's permissions, not its own broad ones. Otherwise it becomes a \"confused deputy\" doing things the user couldn't.",
        "Finally, record every access to sensitive data (who, what, when) in an append-only **audit log** that the people being audited can't edit.",
      ],
      scene: {
        nodes: [
          teacher,
          api,
          grades,
          node("audit", "storage", "Audit log", 2.4, -2.4, { sub: "append only" }),
        ],
        links: [both("teacher", "api", 1), both("api", "grades", 1), link("api", "audit", "write")],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Check that the caller may access this object, on every request.",
        "Accept only allowed fields; back checks with row-level security.",
        "Roles for kinds of users, relationships for sharing.",
        "Decide in a central policy; give services least privilege; act as the user.",
        "Audit who saw what.",
      ],
      scene: {
        nodes: [teacher, api, grades, policy],
        links: [both("teacher", "api", 1), both("api", "policy", 1), both("api", "grades", 1)],
      },
    },
  ],
};

/* -------------------------------------- Encryption and secrets -------------------------------------- */

const laptop = node("laptop", "browser", "Priya", -4, 0, { sub: "café Wi-Fi" });
const router = node("router", "internet", "Wi-Fi + internet", -1.4, 0);
const site = node("site", "server", "AlgoVerse", 1.4, 0);
const store = node("store", "db", "Database", 4, 0);
const kms = node("kms", "lock", "Key service", 1.4, -2.6, { sub: "KMS" });
const wire = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [laptop, router, site, store].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [
    both("laptop", "router", 2),
    both("router", "site", 2),
    both("site", "store", 1),
  ],
});

export const ENCRYPTION: Lesson = {
  id: "encryption",
  title: "Encryption and secrets",
  tagline: "Protecting data on the wire, on disk, and the keys and passwords your services use.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "TLS: encrypting the wire, and certificates",
    "Encrypting inside the data centre",
    "Encryption at rest with a key service",
    "Envelope encryption and key rotation",
    "Keeping secrets out of code",
  ],
  steps: [
    {
      kind: "problem",
      short: "Café Wi-Fi",
      title: "Plain HTTP on café Wi-Fi",
      body: [
        "Priya logs in from a café. If the site used plain `http://`, her password and session cookie would cross the café's router and a dozen networks beyond it as readable text.",
        "Anyone on the same Wi-Fi, or any network in between, could read or change them.",
      ],
      scene: wire({ router: { badge: "can read everything", state: "hot" } }),
    },
    {
      kind: "solution",
      short: "TLS",
      title: "TLS: encrypt the wire",
      body: [
        "With **HTTPS**, TLS encrypts everything between the browser and AlgoVerse. During the handshake the server presents a **certificate**, signed by a certificate authority the browser trusts, proving it really is `algoverse.dev`.",
        "The network now sees only scrambled bytes going to some address.",
      ],
      scene: wire({ router: { badge: "sees noise" } }),
    },
    {
      kind: "case",
      short: "Expired",
      title: "Case: the certificate expired at 3 a.m.",
      body: [
        "Certificates expire. This one was renewed by hand once a year, by someone who has since left. At 03:00 it expires, and every browser shows a full-page security warning.",
        "Automate renewal (the ACME protocol, as used by Let's Encrypt) and alert well before expiry.",
      ],
      scene: wire({ site: { badge: "cert expired", state: "hot" } }, [
        link("laptop", "router", "fail"),
      ]),
    },
    {
      kind: "technique",
      short: "Inside too",
      title: "Encrypt inside the data centre too",
      body: [
        "Traditionally the load balancer ended TLS and sent plain traffic onward, trusting the internal network. But one compromised machine inside could then read everything.",
        "With **mutual TLS** between services, each side proves its identity with a certificate and all internal traffic is encrypted. A service mesh can do this automatically.",
      ],
      scene: wire({ site: { badge: "mTLS inside" } }),
    },
    {
      kind: "problem",
      short: "Backup",
      title: "The stolen backup",
      body: [
        "Every byte on the wire is now safe. Then a database backup is left in a storage bucket that was accidentally made public, and someone copies it.",
        "Encryption in transit doesn't help data that is sitting still.",
      ],
      scene: {
        nodes: [site, store, node("thief", "user", "Someone", 4, 2.6, { hue: "rose" })],
        links: [both("site", "store", 1), link("store", "thief", "heavy")],
      },
    },
    {
      kind: "solution",
      short: "At rest",
      title: "Encrypt at rest, keep the keys elsewhere",
      body: [
        "Encrypt disks, database files and backups. The trick is the key: if it sits next to the data, a thief takes both.",
        "So keys live in a separate **key management service**, often backed by tamper-resistant hardware. Services ask it to decrypt; every use is checked and logged, and keys never leave it.",
      ],
      scene: {
        nodes: [site, store, kms],
        links: [both("site", "store", 1), both("site", "kms", 1)],
      },
    },
    {
      kind: "technique",
      short: "Envelope",
      title: "Rotating keys without re-encrypting everything",
      body: [
        "Keys should change regularly, and immediately if one might have leaked. Re-encrypting terabytes would take days.",
        '**Envelope encryption**: data is encrypted with data keys, and the data keys are encrypted ("wrapped") with a master key in the KMS. Rotating the master key only re-wraps the small data keys.',
      ],
      quiz: {
        question:
          "With envelope encryption, what has to be re-encrypted when the master key rotates?",
        options: ["All the data", "Only the data keys", "Nothing at all"],
        answer: 1,
        why: "The data stays encrypted with its data keys; only those few small keys are re-wrapped with the new master key.",
      },
      scene: {
        nodes: [site, store, { ...kms, badge: "master key v2" }],
        links: [both("site", "store", 1), both("site", "kms", 1)],
      },
    },
    {
      kind: "case",
      short: "In the code",
      title: "Case: a secret in the code",
      body: [
        "A developer hard-codes the email provider's API key to test something, and pushes to a public repository. Bots scan public repositories constantly; the key is abused within minutes.",
        "Deleting the commit isn't enough: the key must be **revoked and replaced**. Secret scanners in CI catch most of these before they leave the laptop.",
      ],
      callout: {
        kind: "watch",
        text: "Assume any secret that touched a public repository is already stolen.",
      },
      scene: wire({ site: { badge: "API key in repo!", state: "hot" } }),
    },
    {
      kind: "solution",
      short: "Manager",
      title: "A secrets manager",
      body: [
        "Keep secrets out of code entirely. The app fetches them at startup from a **secrets manager** (Vault, AWS Secrets Manager), proving its own identity to get only the secrets it needs.",
        "Secrets can then be rotated in one place, and every access is logged.",
      ],
      scene: {
        nodes: [site, store, { ...kms, label: "Secrets manager", sub: "DB password, API keys" }],
        links: [both("site", "kms", 1), both("site", "store", 1)],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "TLS everywhere outside; mutual TLS between services inside.",
        "Automate certificate renewal.",
        "Encrypt at rest, with keys held separately in a KMS; rotate with envelope encryption.",
        "Secrets live in a secrets manager, never in code.",
      ],
      scene: {
        nodes: [laptop, router, site, store, kms],
        links: [
          both("laptop", "router", 2),
          both("router", "site", 2),
          both("site", "store", 1),
          both("site", "kms", 1),
        ],
      },
    },
  ],
};
