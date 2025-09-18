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
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];

      if (
        proxyRes.headers["content-type"] &&
        proxyRes.headers["content-type"].includes("text/html")
      ) {
        let body = responseBuffer.toString("utf8");

        // strip CSP <meta>
        body = body.replace(
          /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
          ""
        );

        // relax frame-ancestors
        body = body.replace(/frame-ancestors [^;]+;/gi, "frame-ancestors *;");

        return body;
      }

      return responseBuffer;
    }),
    pathRewrite: (path) => (path === "/" ? "/projects" : path),
  })
);

// Render sets this at runtime
const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Proxy running on port ${PORT}`);
});
