import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(
  "/captions",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    cookieDomainRewrite: "",
    onProxyRes: (proxyRes) => {
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
    },
    pathRewrite: { "^/captions": "" }
  })
);

app.listen(process.env.PORT || 3000);
