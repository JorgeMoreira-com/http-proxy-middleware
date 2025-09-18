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
      // Remove frame-blocking headers
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];

      // Rewrite redirects to stay on proxy domain
      if (proxyRes.headers["location"]) {
        proxyRes.headers["location"] = proxyRes.headers["location"].replace(
          /^https:\/\/desktop\.captions\.ai/,
          ""
        );
      }
    },
    pathRewrite: (path) => {
      return path === "/" ? "/projects" : path;
    }
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
