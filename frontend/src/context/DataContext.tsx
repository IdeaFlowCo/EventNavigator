import { createContext, useContext, useState, ReactNode } from "react";
import { runSearch } from "../utils/search";

interface DataContextType {
    headers: string[];
    rows: string[][];
    filteredRows: string[][];
    loading: boolean;
    isDisplayingFullData: boolean;
    setData: (headers: string[], rows: string[][]) => void;
    // Update signature to accept optional data
    runSearchQuery: (
        query: string,
        data?: { headers: string[]; rows: string[][] }
    ) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within DataProvider");
    return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);
    const [filteredRows, setFilteredRows] = useState<string[][]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const isDisplayingFullData = rows === filteredRows;

    const setData = (newHeaders: string[], newRows: string[][]) => {
        setHeaders(newHeaders);
        setRows(newRows);
        setFilteredRows(newRows);
    };

    // Update function to accept optional data argument
    const runSearchQuery = async (
        query: string,
        data?: { headers: string[]; rows: string[][] }
    ) => {
        setLoading(true);
        // Determine which data source to use
        const searchHeaders = data ? data.headers : headers;
        const searchRows = data ? data.rows : rows;

        try {
            if (!query.trim()) {
                // If query is empty, show all rows from the *current* context state
                setFilteredRows(rows);
                return;
            }
            // Perform search using the determined headers and rows
            const results = await runSearch(query, searchHeaders, searchRows);
            setFilteredRows(results);
        } catch (error) {
            console.error("Error during search:", error);
            setFilteredRows([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DataContext.Provider
            value={{
                headers,
                rows,
                filteredRows,
                loading,
                isDisplayingFullData,
                setData,
                runSearchQuery,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
