/**
 * Vercel Serverless Function: /api/upload
 * 
 * Securely handles artwork and metadata pinning to IPFS using Pinata.
 * The PINATA_JWT is kept strictly server-side and never exposed to the client bundle.
 */

export default async function handler(req: any, res: any) {
  // Set CORS headers for security and preflight
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const pinataJwt = process.env.PINATA_JWT;

  // Read request payload
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload." });
    }
  }

  const { image, fileName, name, description, attributes } = body || {};

  if (!image) {
    return res.status(400).json({ error: "Missing 'image' base64 data in payload." });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Missing 'name' field in payload." });
  }

  // Check if PINATA_JWT is configured
  if (!pinataJwt) {
    return res.status(500).json({
      error:
        "PINATA_JWT is not configured on the server. Please add PINATA_JWT to your .env file or Vercel Environment Variables.",
      code: "MISSING_PINATA_JWT",
    });
  }

  try {
    // 1. Convert base64 data to Buffer & Blob for Pinata File upload
    const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = "image/png";
    let base64Data = image;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const safeFileName = (fileName || `ethercanvas-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");

    // Use global FormData and Blob (native in Node 18+ and Vercel)
    const fileBlob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append("file", fileBlob, safeFileName);

    const pinataMetadata = JSON.stringify({
      name: `${name} Artwork`,
      keyvalues: {
        app: "EtherCanvas",
        type: "artwork",
      },
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", pinataOptions);

    // 2. Upload Image to Pinata
    const fileRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData,
    });

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      console.error("Pinata file upload failed:", errText);
      return res.status(502).json({
        error: `Pinata file upload failed: ${fileRes.statusText}`,
        details: errText,
      });
    }

    const fileData: any = await fileRes.json();
    const imageCid = fileData.IpfsHash;
    const imageIpfsUri = `ipfs://${imageCid}`;

    // 3. Construct Standard ERC-721 Metadata JSON
    const metadata = {
      name: name.trim(),
      description: description ? description.trim() : "",
      image: imageIpfsUri,
      external_url: "https://ethercanvas.vercel.app",
      attributes: Array.isArray(attributes) ? attributes : [],
      created_at: new Date().toISOString(),
    };

    // 4. Upload Metadata JSON to Pinata
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
          keyvalues: {
            app: "EtherCanvas",
            type: "metadata",
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!jsonRes.ok) {
      const errText = await jsonRes.text();
      console.error("Pinata JSON upload failed:", errText);
      return res.status(502).json({
        error: `Pinata JSON metadata upload failed: ${jsonRes.statusText}`,
        details: errText,
      });
    }

    const jsonData: any = await jsonRes.json();
    const metadataCid = jsonData.IpfsHash;
    const metadataIpfsUri = `ipfs://${metadataCid}`;

    // 5. Return URIs and metadata to client
    return res.status(200).json({
      success: true,
      imageUri: imageIpfsUri,
      imageCid,
      metadataUri: metadataIpfsUri,
      metadataCid,
      metadata,
    });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error during IPFS upload.",
    });
  }
}
