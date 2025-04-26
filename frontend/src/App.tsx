// import logoSrc from '/src/assets/logo.png'; // Remove unused import
// import logoSrc from '/src/assets/logo.png'; // Remove unused import
import "./App.css";
import { useState, useEffect } from "react"; // Import useEffect
import Papa, { ParseResult } from "papaparse";
import * as XLSX from "xlsx";
import { DataProvider, useData } from "@/context/DataContext";
import QuerySection from "@/components/QuerySection";
import DataTable from "@/components/DataTable";
import HowItWorksModal from "@/components/HowItWorksModal"; // Import the modal component
// import ResourcesSection from "@/components/ResourcesSection"; // Remove unused import
import { HelpCircle, Heart, MapPin } from "lucide-react"; // Import the HelpCircle, Heart & MapPin icons

// Define the main layout and logic component
function AppLayout() {
    const {
        headers,
        // isDisplayingFullData, // Removed
        viewMode, // Added
        lastNonFavoriteViewMode, // Added
        setViewMode, // Added
        setData,
        runSearchQuery,
        loading: isSearching,
    } = useData();
    const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
    const [query, setQuery] = useState<string>("");
    const [aboutMe, setAboutMe] = useState<string>(""); // Add state for About Me
    const [sheetUrl, setSheetUrl] = useState<string>(
        "" // Remove default URL but keep placeholder
    );
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoadingSpreadsheet, setIsLoadingSpreadsheet] =
        useState<boolean>(false);
    const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] =
        useState<boolean>(false); // State for modal visibility

    // --- Helper function to fetch and parse data ---
    const parseData = (
        dataToParse: string[][] | string
    ): { headers: string[]; rows: string[][] } | null => {
        try {
            let parsedData: string[][] | null = null;
            if (typeof dataToParse === "string") {
                const results: ParseResult<string[]> = Papa.parse<string[]>(
                    dataToParse,
                    { skipEmptyLines: true }
                );
                parsedData = results.data;
            } else {
                parsedData = dataToParse;
            }

            if (!parsedData || parsedData.length < 1) {
                console.warn("Sheet appears to be empty or inaccessible."); // Use console.warn instead of alert for background fetch
                return null;
            }
            const headers = parsedData[0];
            const rows = parsedData.slice(1);
            return { headers, rows };
        } catch (error) {
            console.error("Error parsing data:", error);
            alert(
                // Keep alert for user-facing errors
                `Failed to parse data. Error: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return null;
        }
    };

    // --- Function to fetch data from URL ---
    const fetchAndSetDataFromUrl = async (url: string, isPrecache = false) => {
        if (
            !url ||
            !url.startsWith("https://docs.google.com/spreadsheets/d/")
        ) {
            if (!isPrecache) {
                // Only alert on explicit user action
                alert("Please enter a valid Google Sheets URL.");
            } else {
                console.warn(
                    "Invalid default Google Sheet URL provided for precache."
                );
            }
            return null; // Indicate failure
        }
        setIsLoadingSpreadsheet(true);
        const csvUrl = url.replace(/\/edit.*$/, "/export?format=csv");
        let parsedResult: { headers: string[]; rows: string[][] } | null = null;
        try {
            const res = await fetch(csvUrl);
            if (!res.ok)
                throw new Error(`Failed to fetch sheet: ${res.statusText}`);
            const text = await res.text();
            parsedResult = parseData(text);
            if (parsedResult) {
                setData(parsedResult.headers, parsedResult.rows);
            } else {
                setData([], []); // Clear data if parsing failed
                if (!isPrecache) {
                    // Only alert if not precaching and parsing failed
                    alert("Failed to parse the data from the source.");
                }
            }
        } catch (error) {
            console.error("Error fetching or parsing URL:", error);
            if (!isPrecache) {
                // Only alert on explicit user action
                alert(
                    `Failed to load data from URL. Check permissions or URL. Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
            setData([], []); // Clear data on fetch error
            parsedResult = null; // Ensure null is returned on error
        } finally {
            setIsLoadingSpreadsheet(false);
        }
        return parsedResult; // Return the result (or null if failed)
    };

    // --- Effect Hook for Pre-caching ---
    useEffect(() => {
        // Fetch data from the default URL when the component mounts
        console.log("Attempting to precache default sheet:", sheetUrl);
        fetchAndSetDataFromUrl(sheetUrl, true); // Pass true for isPrecache
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    const handleTabChange = (value: "url" | "upload") => {
        setActiveTab(value);
    };

    const handleQueryChange = (value: string) => {
        setQuery(value);
    };

    const handleAboutMeChange = (value: string) => {
        // Add handler for About Me
        setAboutMe(value);
    };

    const handleSheetUrlChange = (value: string) => {
        setSheetUrl(value);
    };

    const handleFileChange = (newFile: File | null) => {
        setFile(newFile);
        setFileName(newFile ? newFile.name : null);
    };

    // Function to open the modal
    const openHowItWorksModal = () => {
        setIsHowItWorksModalOpen(true);
    };

    // Function to close the modal
    const closeHowItWorksModal = () => {
        setIsHowItWorksModalOpen(false);
    };

    const handleSubmit = async () => {
        // Clear previous results only when initiating a new search/load
        setData([], []);
        let parsedResult: { headers: string[]; rows: string[][] } | null = null;

        // Combine aboutMe and query for the final search
        const finalQuery = aboutMe
            ? `About me: ${aboutMe}. Looking for: ${query}`
            : query;

        if (activeTab === "url") {
            // Use the extracted function
            parsedResult = await fetchAndSetDataFromUrl(sheetUrl);
            // No need to set loading state here, fetchAndSetDataFromUrl handles it
        } else if (activeTab === "upload" && file) {
            setIsLoadingSpreadsheet(true); // Set loading for file processing
            const ext = file.name.split(".").pop()?.toLowerCase();
            try {
                if (ext === "csv") {
                    const text = await file.text();
                    parsedResult = parseData(text);
                } else if (ext === "xls" || ext === "xlsx") {
                    const fileData = await file.arrayBuffer();
                    const workbook = XLSX.read(new Uint8Array(fileData), {
                        type: "array",
                    });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json<string[]>(worksheet, {
                        header: 1,
                        raw: false,
                    });
                    parsedResult = parseData(json);
                } else {
                    alert("Unsupported file type.");
                }
            } catch (error) {
                console.error("Error reading or parsing file:", error);
                alert(
                    `Failed to process file. Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
            setIsLoadingSpreadsheet(false); // Unset loading after file processing
        }

        // Run search query only if data was successfully loaded/parsed
        if (parsedResult) {
            // setData is now called within fetchAndSetDataFromUrl or after file parsing
            if (finalQuery.trim()) {
                // If there's a query, set view mode to search
                setViewMode("search");
                try {
                    // Pass the freshly parsed data directly to the updated function
                    await runSearchQuery(finalQuery, parsedResult);
                } catch (searchError) {
                    console.error("Search operation failed:", searchError);
                    alert("An error occurred during the search."); // Inform the user
                }
            } else {
                // If no query, show all data after loading
                setViewMode("all");
                // No need to call runSearchQuery if there's no query
            }
        } else {
            // If loading failed, clear headers/rows and set view mode to all
            setData([], []);
            setViewMode("all");
        }
        // No else needed, setData handled within fetch/parse logic
    };

    return (
        // Apply class name for App Layout
        <div className="app-layout">
            {/* Apply class name for Header */}
            <header className="app-header">
                {/* Apply class name for Header Content */}
                <div className="header-content">
                    {/* Apply class name for Logo/Title */}
                    <div className="logo-title">
                        <MapPin /> {/* Replace SVG with MapPin icon */}
                        Event Navigator
                    </div>
                    {/* Apply class name for Nav */}
                    <nav className="app-nav">
                        {/* Change link to button triggering the modal */}
                        <button
                            onClick={openHowItWorksModal}
                            className="nav-link"
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            <HelpCircle strokeWidth={2.5} />
                            How it works
                        </button>
                        {/* Apply class name for Nav Link */}
                        <a
                            href="https://github.com/IdeaFlowCo/EventNavigator"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-link"
                        >
                            <svg // Placeholder SVG - Add relevant path
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                            GitHub
                        </a>
                    </nav>
                </div>
            </header>

            {/* Apply class name for Main Content */}
            <main className="main-content">
                {/* Apply class name for Intro Section */}
                <div className="intro-section">
                    <h1>Find Your Next Event Experience</h1>
                    <p>
                        Discover workshops, performances, talks, and gatherings
                        from any event schedule or spreadsheet. Find what
                        matches your interests.
                    </p>
                </div>

                <QuerySection
                    query={query}
                    sheetUrl={sheetUrl}
                    file={file}
                    fileName={fileName}
                    isLoading={isSearching}
                    isLoadingSpreadsheet={isLoadingSpreadsheet}
                    activeTab={activeTab}
                    aboutMe={aboutMe}
                    onQueryChange={handleQueryChange}
                    onSheetUrlChange={handleSheetUrlChange}
                    onFileChange={handleFileChange}
                    onTabChange={handleTabChange}
                    onAboutMeChange={handleAboutMeChange}
                    onSubmit={handleSubmit}
                />

                {/* Conditional Rendering for Table Area with Button Repositioned */}
                {headers.length > 0 && (
                    <div
                        className="table-area-wrapper"
                        style={{ position: "relative" }}
                    >
                        {" "}
                        {/* New wrapper */}
                        {/* Heading */}
                        <h2 className="text-lg font-semibold mb-2">
                            {" "}
                            {/* Moved h2 inside, kept margin */}
                            {viewMode === "favorites"
                                ? "My Favorites"
                                : viewMode === "search"
                                ? "Search Results"
                                : "All Events"}
                        </h2>
                        {/* DataTable */}
                        <DataTable /> {/* Moved DataTable inside */}
                        {/* Favorites Button (Standard HTML with custom CSS class) */}
                        <button
                            type="button"
                            className="favorites-toggle-button" // New custom class
                            onClick={() => {
                                const nextView =
                                    viewMode === "favorites"
                                        ? lastNonFavoriteViewMode
                                        : "favorites";
                                setViewMode(nextView);
                            }}
                            data-favorited={viewMode === "favorites"} // Data attribute for CSS styling
                            // style prop removed - positioning handled in App.css
                        >
                            <Heart
                            // className removed - styling handled in App.css
                            // Size controlled via CSS potentially
                            />
                            <span>
                                {" "}
                                {/* Wrap text in span for potential styling */}
                                {viewMode === "favorites"
                                    ? "Show All"
                                    : "My Favorites"}
                            </span>
                        </button>
                    </div>
                )}
            </main>

            {/* Apply class name for Footer */}
            <footer className="app-footer">
                {/* Apply class name for Footer Content */}
                <div className="footer-content">
                    <p>
                        Event Navigator is an open-source project.{" "}
                        {/* Apply class name for Footer Link */}
                        <a
                            href="https://github.com/IdeaFlowCo/EventNavigator"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-link"
                        >
                            <svg // Placeholder SVG - Add relevant path
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                            View on GitHub
                        </a>
                    </p>
                    <p>
                        {/* Built with AI assistance • */}
                        MIT License
                        {/* • No data is stored */}
                    </p>
                </div>
            </footer>

            {/* Conditionally render the modal */}
            <HowItWorksModal
                isOpen={isHowItWorksModalOpen}
                onClose={closeHowItWorksModal}
            />
        </div>
    );
}

// App component now just sets up the provider
function App() {
    return (
        <DataProvider>
            <AppLayout />
        </DataProvider>
    );
}

export default App;
