import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(
  "/",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "",

    onProxyRes: (proxyRes, req, res) => {
      // Remove any frame-blocking headers
      if (proxyRes.headers['x-frame-options']) delete proxyRes.headers['x-frame-options'];
      if (proxyRes.headers['content-security-policy']) delete proxyRes.headers['content-security-policy'];
      if (proxyRes.headers['x-content-security-policy']) delete proxyRes.headers['x-content-security-policy'];
      if (proxyRes.headers['x-webkit-csp']) delete proxyRes.headers['x-webkit-csp'];

      // Rewrite redirects to stay under proxy
      if (proxyRes.headers["location"]) {
        proxyRes.headers["location"] = proxyRes.headers["location"].replace(
          /^https:\/\/desktop\.captions\.ai/,
          ""
        );
      }
    },

    pathRewrite: (path) => (path === "/" ? "/projects" : path),
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
