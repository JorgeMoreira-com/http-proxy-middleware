import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Proxy everything at "/" to captions.ai
app.use(
  "/",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    cookieDomainRewrite: "",
    onProxyRes: (proxyRes) => {
      // Remove frame-blocking headers
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
    },
    pathRewrite: (path, req) => {
      // Force all root requests to go to /projects
      return "/projects";
    }
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
