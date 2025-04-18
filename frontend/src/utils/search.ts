import openai from "../openaiClient";

const CHUNK_SIZE = 150; // Max rows per LLM call

// Helper function to process a single chunk
const processChunk = async (
    query: string,
    headers: string[],
    chunk: string[][],
    offset: number // Original starting index of this chunk
): Promise<number[]> => {
    // Prepare data for the prompt (1-based indexing for rows relative to original data)
    const formattedHeaders = JSON.stringify(headers);
    const formattedRows = chunk
        .map(
            (row, index) => `Row ${offset + index + 1}: ${JSON.stringify(row)}`
        ) // Use original index
        .join("\n");

    const prompt = `instructions: find rows related to the user's query. consider each row individually and how relevant it is. come up with a relevance score from 0.0-1.0.
Headers: ${formattedHeaders}
Rows:\n${formattedRows}
Query: find me events related to '${query}'.
Output: your output should be a JSON array of row indices, 1-indexed, relative to the original data provided in this prompt. eg [${
        offset + 1
    }, ${
        offset + 2
    }, ...] Only return indices that match the query. You could measure this by any results with a relevance score of 0.7 or greater. Respond ONLY with the JSON array.`;

    try {
        const resp = await openai.chat.completions.create({
            model: "gpt-4.1-mini-2025-04-14",
            messages: [{ role: "user", content: prompt }],
        });

        const content = resp.choices?.[0]?.message?.content?.trim() || "";

        if (!content) {
            console.error(
                `LLM returned empty content for chunk starting at ${
                    offset + 1
                }.`
            );
            return [];
        }

        // Attempt to parse the JSON array response
        let indices: number[] = [];
        try {
            const cleanedContent = content.replace(/```json|```/g, "").trim();
            indices = JSON.parse(cleanedContent);
            if (!Array.isArray(indices) || indices.some(isNaN)) {
                throw new Error(
                    "Parsed content is not a valid array of numbers."
                );
            }
            // Validate indices are within the expected original range for this chunk
            indices = indices.filter(
                (index) => index > offset && index <= offset + chunk.length
            );
        } catch (parseError) {
            console.error(
                `Failed to parse LLM response for chunk starting at ${
                    offset + 1
                }:`,
                parseError,
                "Raw content:",
                content
            );
            return [];
        }

        return indices; // Return original 1-based indices
    } catch (error) {
        console.error(
            `Error processing chunk starting at ${offset + 1}:`,
            error
        );
        return [];
    }
};

export const runSearch = async (
    query: string,
    headers: string[],
    rows: string[][]
): Promise<string[][]> => {
    if (!query) {
        return rows;
    }
    if (!rows || rows.length === 0) {
        return [];
    }

    const chunks: { chunk: string[][]; offset: number }[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push({
            chunk: rows.slice(i, i + CHUNK_SIZE),
            offset: i, // 0-based offset
        });
    }

    try {
        const chunkPromises = chunks.map(({ chunk, offset }) =>
            processChunk(query, headers, chunk, offset)
        );

        const results = await Promise.all(chunkPromises);

        // Aggregate all indices from different chunks
        const allIndices = results.flat();

        // Ensure uniqueness and sort
        const uniqueIndices = [...new Set(allIndices)].sort((a, b) => a - b);

        // Filter rows based on the unique 1-based indices from the LLM
        const filteredRows = uniqueIndices
            .map((index) => rows[index - 1]) // Convert 1-based index to 0-based
            .filter((row): row is string[] => row !== undefined); // Type guard for filtering

        return filteredRows;
    } catch (error) {
        console.error("Error during parallel chunk processing:", error);
        // Fallback or specific error handling needed here
        return []; // Return empty results on top-level error
    }
};
