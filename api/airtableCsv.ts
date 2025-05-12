// Vercel Serverless Function: secure relay for Airtable CSV exports
// Accepts GET /api/airtableCsv?url=<encoded Airtable CSV URL>
// Streams the CSV back with CORS enabled, after validating that the target URL
// matches Airtable's public CSV pattern. No API keys required.
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

// Basic regex: https://airtable.com/v0.3/view/<id>?exportCSV=true
const AIRTABLE_CSV_RE =
    /^https:\/\/airtable\.com\/v0\.3\/view\/[A-Za-z0-9]+\?exportCSV=true(?:[&#].*)?$/;

// Share page pattern e.g. https://airtable.com/appXXXXXXXXXXXX/shrYYYYYYYYYYYYY
const AIRTABLE_SHARE_RE =
    /^https:\/\/airtable\.com\/app[A-Za-z0-9]+\/shr[A-Za-z0-9]+/;

// Using 'any' for req/res to avoid needing @vercel/node types in the local dev env.
export default async function handler(req: any, res: any) {
    // The client URL parameter may be URL-encoded. Decode once here for validation/fetch.
    const { url } = req.query;
    if (!url || typeof url !== "string") {
        res.status(400).json({ error: 'Missing "url" query param' });
        return;
    }

    const decodedUrl = decodeURIComponent(url);

    let finalCsvUrl: string | null = null;

    if (AIRTABLE_CSV_RE.test(decodedUrl)) {
        finalCsvUrl = decodedUrl; // Already a CSV endpoint
    } else if (AIRTABLE_SHARE_RE.test(decodedUrl)) {
        try {
            // Fetch the share page HTML to discover the underlying view id.
            const htmlRes = await fetch(decodedUrl);
            const html = await htmlRes.text();

            // Look for /v0.3/view/viwXXXXXXXX/downloadCsv or ?exportCSV
            const match = html.match(/v0\.3\/view\/(viw[A-Za-z0-9]+)/);
            if (match) {
                const viewId = match[1];
                finalCsvUrl = `https://airtable.com/v0.3/view/${viewId}?exportCSV=true`;
            } else {
                res.status(400).json({
                    error: "Could not locate view id in share link",
                });
                return;
            }
        } catch (scrapeErr) {
            console.error("Error scraping share page", scrapeErr);
            res.status(500).json({ error: "Failed to process share link" });
            return;
        }
    } else {
        res.status(400).json({ error: "Invalid Airtable URL" });
        return;
    }

    try {
        const airtableRes = await fetch(finalCsvUrl);
        if (!airtableRes.ok) {
            res.status(airtableRes.status).end();
            return;
        }

        // Pass through upstream headers & CORS
        res.setHeader(
            "Content-Type",
            airtableRes.headers.get("content-type") || "text/csv"
        );
        res.setHeader("Access-Control-Allow-Origin", "*");

        // Stream body to client to avoid buffering large files.
        await streamPipeline(airtableRes.body as any, res);
    } catch (error) {
        console.error("airtableCsv proxy error", error);
        res.status(500).json({ error: "Failed to fetch Airtable CSV" });
    }
}
