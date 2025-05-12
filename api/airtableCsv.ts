// Vercel Serverless Function: secure relay for Airtable CSV exports
// Accepts GET /api/airtableCsv?url=<encoded Airtable CSV URL>
// Streams the CSV back with CORS enabled, after validating that the target URL
// matches Airtable's public CSV pattern. No API keys required.
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

// Basic regex: https://airtable.com/v0.3/view/<id>?exportCSV=true(<optional params>)
const AIRTABLE_CSV_RE =
    /^https:\/\/airtable\.com\/v0\.3\/view\/[A-Za-z0-9]+\/downloadCsv\?.*$/;

// Using 'any' for req/res to avoid needing @vercel/node types in the local dev env.
export default async function handler(req: any, res: any) {
    // The client URL parameter may be URL-encoded. Decode once here for validation/fetch.
    const { url } = req.query;
    if (!url || typeof url !== "string") {
        res.status(400).json({ error: 'Missing "url" query param' });
        return;
    }

    const decodedUrl = decodeURIComponent(url);

    // Prevent open-proxy abuse – only allow Airtable CSV endpoints.
    if (!AIRTABLE_CSV_RE.test(decodedUrl)) {
        res.status(400).json({ error: "Invalid Airtable CSV URL" });
        return;
    }

    try {
        const airtableRes = await fetch(decodedUrl);
        if (!airtableRes.ok) {
            res.status(airtableRes.status).end();
            return;
        }

        // Pass through headers
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Stream body to client to avoid buffering large files.
        await streamPipeline(airtableRes.body as any, res);
    } catch (error) {
        console.error("airtableCsv proxy error", error);
        res.status(500).json({ error: "Failed to fetch Airtable CSV" });
    }
}
