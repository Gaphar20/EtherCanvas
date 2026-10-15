import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Local dev server middleware for /api/upload to match Vercel Serverless Function locally
function localUploadApiPlugin() {
  return {
    name: "local-upload-api",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === "/api/upload" && req.method === "POST") {
          let rawBody = "";
          req.on("data", (chunk: any) => {
            rawBody += chunk;
          });

          req.on("end", async () => {
            res.setHeader("Content-Type", "application/json");

            try {
              const body = JSON.parse(rawBody || "{}");
              const pinataJwt = process.env.PINATA_JWT;

              const { image, fileName, name, description, attributes } = body;

              if (!image) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing 'image' base64 data in payload." }));
                return;
              }

              if (!name || !name.trim()) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing 'name' field in payload." }));
                return;
              }

              if (!pinataJwt) {
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    error:
                      "PINATA_JWT is not configured on the server. Please add PINATA_JWT to your .env file.",
                    code: "MISSING_PINATA_JWT",
                  })
                );
                return;
              }

              // Parse image base64
              const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
              let mimeType = "image/png";
              let base64Data = image;

              if (match) {
                mimeType = match[1];
                base64Data = match[2];
              }

              const buffer = Buffer.from(base64Data, "base64");
              const safeFileName = (fileName || `ethercanvas-${Date.now()}`).replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
              );

              const fileBlob = new Blob([buffer], { type: mimeType });
              const formData = new FormData();
              formData.append("file", fileBlob, safeFileName);

              formData.append(
                "pinataMetadata",
                JSON.stringify({
                  name: `${name} Artwork`,
                  keyvalues: { app: "EtherCanvas", type: "artwork" },
                })
              );
              formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

              // Upload file to Pinata
              const fileRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${pinataJwt}`,
                },
                body: formData,
              });

              if (!fileRes.ok) {
                const errText = await fileRes.text();
                res.statusCode = 502;
                res.end(
                  JSON.stringify({
                    error: `Pinata file upload failed: ${fileRes.statusText}`,
                    details: errText,
                  })
                );
                return;
              }

              const fileData: any = await fileRes.json();
              const imageCid = fileData.IpfsHash;
              const imageIpfsUri = `ipfs://${imageCid}`;

              // Metadata JSON
              const metadata = {
                name: name.trim(),
                description: description ? description.trim() : "",
                image: imageIpfsUri,
                external_url: "https://ethercanvas.vercel.app",
                attributes: Array.isArray(attributes) ? attributes : [],
                created_at: new Date().toISOString(),
              };

              const jsonRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${pinataJwt}`,
                },
                body: JSON.stringify({
                  pinataContent: metadata,
                  pinataMetadata: {
                    name: `${name} Metadata`,
                    keyvalues: { app: "EtherCanvas", type: "metadata" },
                  },
                  pinataOptions: { cidVersion: 1 },
                }),
              });

              if (!jsonRes.ok) {
                const errText = await jsonRes.text();
                res.statusCode = 502;
                res.end(
                  JSON.stringify({
                    error: `Pinata JSON metadata upload failed: ${jsonRes.statusText}`,
                    details: errText,
                  })
                );
                return;
              }

              const jsonData: any = await jsonRes.json();
              const metadataCid = jsonData.IpfsHash;
              const metadataIpfsUri = `ipfs://${metadataCid}`;

              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  imageUri: imageIpfsUri,
                  imageCid,
                  metadataUri: metadataIpfsUri,
                  metadataCid,
                  metadata,
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error: err.message || "Failed to process upload in local dev server.",
                })
              );
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localUploadApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
