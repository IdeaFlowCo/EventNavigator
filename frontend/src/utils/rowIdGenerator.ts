/**
 * Generates a unique ID for a table row based on UID column or row content
 * @param row - The row data array
 * @param index - The row index in the dataset
 * @param uidColumnIndex - Index of the UID column (-1 if not found)
 * @returns A stable unique identifier for the row
 */
export const generateRowId = (
    row: string[],
    index: number,
    uidColumnIndex: number
): string => {
    // Validate inputs
    if (!Array.isArray(row)) {
        console.warn('Invalid row data provided to generateRowId');
        return `row-${index}-invalid`;
    }

    // If there's a UID column, use it
    if (uidColumnIndex >= 0 && uidColumnIndex < row.length) {
        const uid = row[uidColumnIndex];
        // Ensure UID is not empty
        if (uid && uid.trim()) {
            return uid.trim();
        }
    }

    // Fallback: create an ID from row content
    // Use first 3 non-empty columns plus index for stability
    const significantColumns = row
        .slice(0, 3)
        .filter(col => col && col.trim()) // Filter out empty columns
        .map(col => col.trim().substring(0, 50)) // Limit length for performance
        .join('|');
    
    // If no significant content, use index only
    if (!significantColumns) {
        return `row-${index}-empty`;
    }
    
    return `row-${index}-${significantColumns}`;
};