import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(
  "/",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    secure: false, // allow proxying to HTTPS even if strict
    cookieDomainRewrite: "", 
    onProxyRes: (proxyRes) => {
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
    },
    pathRewrite: (path, req) => {
      // Default / → /projects
      return path === "/" ? "/projects" : path;
    }
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
