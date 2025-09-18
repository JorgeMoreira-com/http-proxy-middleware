// server.js
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PROXY_TARGET = "https://desktop.captions.ai";

function rewriteSetCookieArray(setCookieArray) {
  return setCookieArray.map((cookie) => {
    // remove Domain=... if present
    cookie = cookie.replace(/;\s*Domain=[^;]+/i, "");

    // Ensure SameSite=None
    if (/;\s*SameSite=/i.test(cookie)) {
      cookie = cookie.replace(/;\s*SameSite=(Lax|Strict)/i, "; SameSite=None");
    } else {
      cookie += "; SameSite=None";
    }

    // Ensure Secure
    if (!/;\s*Secure/i.test(cookie)) cookie += "; Secure";

    return cookie;
  });
}

app.use(
  "/",
  createProxyMiddleware({
    target: PROXY_TARGET,
    changeOrigin: true,
    secure: false,
    selfHandleResponse: true, // we will modify responses manually
    onProxyRes: (proxyRes, req, res) => {
      // collect chunks
      const chunks = [];
      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", () => {
        try {
          const bodyBuffer = Buffer.concat(chunks);
          const contentType = (proxyRes.headers["content-type"] || "").toLowerCase();

          // 1) Rewrite Location redirects to keep them under the proxy path
          if (proxyRes.headers.location) {
            proxyRes.headers.location = proxyRes.headers.location.replace(
              new RegExp(`^${PROXY_TARGET}`),
              ""
            );
          }

          // 2) Rewrite Set-Cookie headers
          if (proxyRes.headers["set-cookie"]) {
            const newCookies = rewriteSetCookieArray(proxyRes.headers["set-cookie"]);
            res.setHeader("set-cookie", newCookies);
          }

          // 3) copy headers (except those we don't want)
          Object.entries(proxyRes.headers).forEach(([name, value]) => {
            const low = name.toLowerCase();
            if (low === "content-length" || low === "content-encoding") return;
            if (low === "x-frame-options" || low === "content-security-policy") return;
            if (low === "set-cookie") return; // already set above
            res.setHeader(name, value);
          });

          // 4) If HTML, scrub CSP meta tags and framebust scripts
          if (contentType.includes("text/html")) {
            let body = bodyBuffer.toString("utf8");

            // remove inline CSP meta tags
            body = body.replace(
              /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
              ""
            );

            // remove <script> blocks that look like frame busting (heuristic)
            body = body.replace(
              /<script\b[^>]*>[\s\S]*?(?:top\.location|window\.top|if\s*\(\s*top\s*!==\s*self|if\s*\(\s*self\.location\.hostname)[\s\S]*?<\/script>/gi,
              "<!-- framebust removed -->"
            );

            // generic replacement for direct top.location references
            body = body.replace(/top\.location/g, "/*top.location blocked*/");

            // inject a tiny marker script early in <head> to try to run before later scripts
            body = body.replace(
              /<head([^>]*)>/i,
              `<head$1><script>/* injected to reduce framebust chances */ window.__frameProxy=true;</script>`
            );

            const outBuf = Buffer.from(body, "utf8");
            res.setHeader("content-length", Buffer.byteLength(outBuf));
            res.write(outBuf);
            res.end();
            return;
          }

          // 5) non-HTML -> just forward bytes
          res.write(bodyBuffer);
          res.end();
        } catch (err) {
          console.error("Proxy response handling error:", err);
          res.statusCode = 500;
          res.end("Proxy error");
        }
      });
    },
    pathRewrite: (path) => (path === "/" ? "/projects" : path),
  })
);

const PORT = process.env.PORT || 3000;  // fallback only for local dev
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy running on port ${PORT}`);
});
