// server.js
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PROXY_TARGET = "https://desktop.captions.ai";

// Allow embedding in iframe
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

// 1. Normal proxy for all assets & APIs (streaming, websockets)
app.use(
  ["/static", "/api", "/sockjs-node", "/socket.io", "/assets"],
  createProxyMiddleware({
    target: PROXY_TARGET,
    changeOrigin: true,
    ws: true,
    secure: false,
  })
);

// 2. Special proxy for root + HTML pages (scrub CSP, framebust, etc.)
import { Buffer } from "buffer";
function htmlProxy() {
  return createProxyMiddleware({
    target: PROXY_TARGET,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: async (proxyRes, req, res) => {
      let body = Buffer.from([]);
      proxyRes.on("data", (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      proxyRes.on("end", () => {
        try {
          let html = body.toString("utf8");

          // strip CSP meta
          html = html.replace(
            /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
            ""
          );

          // strip obvious framebust scripts
          html = html.replace(
            /<script\b[^>]*>[\s\S]*?(?:top\.location|window\.top)[\s\S]*?<\/script>/gi,
            "<!-- framebust removed -->"
          );

          res.setHeader("content-type", "text/html; charset=utf-8");
          res.end(html);
        } catch (err) {
          console.error("HTML proxy error:", err);
          res.status(500).end("Proxy error");
        }
      });
    },
    pathRewrite: (path) => (path === "/" ? "/projects" : path),
  });
}
app.use("/", htmlProxy());

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on port ${PORT}`);
});
