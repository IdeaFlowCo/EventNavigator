import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import { runSearch } from "../utils/search";
import { generateRowId } from "../utils/rowIdGenerator";

type ViewMode = "all" | "search" | "favorites";

interface DataContextType {
    headers: string[];
    uidColumnIndex: number; // Add index for UID column
    allRows: string[][]; // Rename 'rows' to 'allRows' for clarity
    filteredRows: string[][];
    loading: boolean;
    // isDisplayingFullData: boolean; // Replace with viewMode
    viewMode: ViewMode;
    lastNonFavoriteViewMode: Exclude<ViewMode, "favorites">;
    favoriteIds: Set<string>;
    setData: (headers: string[], rows: string[][]) => void;
    runSearchQuery: (
        query: string,
        data?: { headers: string[]; rows: string[][] }
    ) => Promise<void>;
    addFavorite: (uid: string) => void;
    removeFavorite: (uid: string) => void;
    setViewMode: (mode: ViewMode) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = "brcNavigatorFavorites";
export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [headers, setHeaders] = useState<string[]>([]);
    const [allRows, setAllRows] = useState<string[][]>([]); // Renamed from rows
    const [filteredRows, setFilteredRows] = useState<string[][]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [viewMode, setViewModeState] = useState<ViewMode>("all");
    const [lastNonFavoriteViewMode, setLastNonFavoriteViewMode] =
        useState<Exclude<ViewMode, "favorites">>("all");
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
        // Load favorites from localStorage on initial load
        try {
            const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (storedFavorites) {
                const parsed = JSON.parse(storedFavorites);
                // Validate that it's an array
                if (Array.isArray(parsed)) {
                    return new Set(parsed);
                }
            }
            return new Set();
        } catch (error) {
            console.error("Error reading favorites from localStorage:", error);
            // Clear corrupted data
            try {
                localStorage.removeItem(FAVORITES_STORAGE_KEY);
            } catch (e) {
                // Ignore if we can't clear
            }
            return new Set();
        }
    });

    // Find the index of the 'UID' column
    const uidColumnIndex = useMemo(() => {
        return headers.findIndex(
            (header) => header.toUpperCase() === "UID" // Case-insensitive check
        );
    }, [headers]);

    // Persist favorites to localStorage whenever they change
    useEffect(() => {
        try {
            const favorites = Array.from(favoriteIds);
            // Limit the number of favorites to prevent quota exceeded errors
            if (favorites.length > 1000) {
                console.warn("Too many favorites, limiting to 1000");
                favorites.splice(1000);
            }
            localStorage.setItem(
                FAVORITES_STORAGE_KEY,
                JSON.stringify(favorites)
            );
        } catch (error) {
            console.error("Error saving favorites to localStorage:", error);
            // If quota exceeded or other error, try to clear old data
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                try {
                    localStorage.removeItem(FAVORITES_STORAGE_KEY);
                    console.warn("localStorage quota exceeded, cleared favorites");
                } catch (e) {
                    // Ignore
                }
            }
        }
    }, [favoriteIds]);

    const addFavorite = useCallback((uid: string) => {
        setFavoriteIds((prev) => new Set(prev).add(uid));
    }, []);

    const removeFavorite = useCallback((uid: string) => {
        setFavoriteIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(uid);
            return newSet;
        });
    }, []);

    const setViewMode = useCallback(
        (mode: ViewMode) => {
            if (mode !== "favorites") {
                setLastNonFavoriteViewMode(mode); // Track last non-fav view
            }
            setViewModeState(mode);
        },
        [setLastNonFavoriteViewMode, setViewModeState]
    );

    const setData = useCallback(
        (newHeaders: string[], newRows: string[][]) => {
            setHeaders(newHeaders);
            setAllRows(newRows);
            // Reset view to 'all' when new data is loaded
            setViewMode("all");
            // Filter based on the new 'all' view mode immediately
            setFilteredRows(newRows);
        },
        [setViewMode]
    ); // Include setViewMode dependency

    // Update function to accept optional data argument and handle view modes
    const runSearchQuery = useCallback(
        async (
            query: string,
            data?: { headers: string[]; rows: string[][] }
        ) => {
            setLoading(true);
            setViewMode("search"); // Always switch to search view on query
            const sourceHeaders = data ? data.headers : headers;
            const sourceRows = data ? data.rows : allRows; // Use allRows

            try {
                if (!query.trim()) {
                    // If query is empty, revert to 'all' view
                    setViewMode("all");
                    setFilteredRows(allRows); // Show all rows
                    return;
                }
                // Perform search using the determined headers and rows
                const results = await runSearch(
                    query,
                    sourceHeaders,
                    sourceRows
                );
                setFilteredRows(results); // Update filtered rows with search results
            } catch (error) {
                console.error("Error during search:", error);
                setFilteredRows([]); // Clear results on error
            } finally {
                setLoading(false);
            }
        },
        [headers, allRows, setViewMode] // Add dependencies
    );

    // Use the unified generateRowId function from utils
    const getRowId = useCallback((row: string[], index: number): string => {
        return generateRowId(row, index, uidColumnIndex);
    }, [uidColumnIndex]);

    // Effect to update filteredRows when viewMode or favorites change
    useEffect(() => {
        if (viewMode === "favorites") {
            const favRows = allRows.filter((row, index) => {
                const rowId = getRowId(row, index);
                return favoriteIds.has(rowId);
            });
            setFilteredRows(favRows);
        } else if (viewMode === "all") {
            setFilteredRows(allRows);
        }
        // 'search' view is handled by runSearchQuery
    }, [viewMode, favoriteIds, allRows, getRowId]);

    return (
        <DataContext.Provider
            value={{
                headers,
                uidColumnIndex,
                allRows, // Use allRows
                filteredRows,
                loading,
                viewMode,
                lastNonFavoriteViewMode,
                favoriteIds,
                setData,
                runSearchQuery,
                addFavorite,
                removeFavorite,
                setViewMode,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
