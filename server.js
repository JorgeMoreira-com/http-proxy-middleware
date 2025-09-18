import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { Buffer } from "buffer";

const app = express();

app.use(
  "/",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "",

    selfHandleResponse: true, // allows us to modify the response

    onProxyRes: async (proxyRes, req, res) => {
      const chunks = [];

      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", () => {
        const body = Buffer.concat(chunks);
        let content = body.toString("utf8");

        // Rewrite HTML meta CSP if present
        content = content.replace(
          /<meta http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
          '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\' data: blob:;">'
        );

        // Set headers
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (
            !["x-frame-options", "content-security-policy", "x-content-security-policy", "x-webkit-csp"].includes(
              key.toLowerCase()
            )
          ) {
            res.setHeader(key, value);
          }
        });

        // Rewrite redirects to stay in proxy
        if (proxyRes.headers["location"]) {
          res.setHeader(
            "location",
            proxyRes.headers["location"].replace(/^https:\/\/desktop\.captions\.ai/, "")
          );
        }

        res.status(proxyRes.statusCode);
        res.send(content);
      });
    },

    pathRewrite: (path) => (path === "/" ? "/projects" : path),
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
