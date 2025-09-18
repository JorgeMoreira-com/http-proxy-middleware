import express from "express";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";

const app = express();

app.use(
  "/",
  createProxyMiddleware({
    target: "https://desktop.captions.ai",
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "",
    selfHandleResponse: true, // allows modifying HTML
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      // Remove problematic headers
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];

      if (
        proxyRes.headers["content-type"] &&
        proxyRes.headers["content-type"].includes("text/html")
      ) {
        let body = responseBuffer.toString("utf8");

        // Remove CSP meta tags
        body = body.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

        // (Optional) adjust frame-ancestors if injected inline
        body = body.replace(/frame-ancestors [^;]+;/gi, "frame-ancestors *;");

        return body;
      }

      return responseBuffer;
    }),
    pathRewrite: (path) => (path === "/" ? "/projects" : path),
    onProxyRes: (proxyRes) => {
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
    }
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
