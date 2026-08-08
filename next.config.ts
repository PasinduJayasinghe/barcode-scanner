import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * `'unsafe-inline'` on script-src is the honest cost of not running a nonce
 * proxy: Next inlines its hydration bootstrap, and a nonce has to be minted per
 * request to avoid it. The exposure is small here — this app renders no
 * user-supplied HTML and has no authenticated session or cookie to steal — and
 * the rest of the policy still blocks the things that matter: no framing, no
 * plugins, no arbitrary origins to exfiltrate to.
 *
 * `blob:`/`data:` on img-src are required: captured photos are held as data
 * URLs, and the CSV download is a blob.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // The browser only ever talks to this origin; the Groq call is server-side.
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // `capture="environment"` hands off to the OS camera app rather than
    // getUserMedia, so `camera=()` is safe and closes the surface entirely.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Extraction responses carry product data and are never reusable.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
