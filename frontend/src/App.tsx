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
import { HelpCircle, Heart, MapPin, Share2, Copy, Check, X } from "lucide-react"; // Import the HelpCircle, Heart, MapPin, Share2, Copy, Check & X icons

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
    const [isShortlinkModalOpen, setIsShortlinkModalOpen] = useState<boolean>(false); // State for shortlink modal
    const [shortlinkInput, setShortlinkInput] = useState<string>("");
    const [generatedShortlink, setGeneratedShortlink] = useState<string>("");
    const [showCopied, setShowCopied] = useState<boolean>(false);
    const [shortlinkError, setShortlinkError] = useState<string>("");

    // --- URL Path to Spreadsheet Mapping ---
    const pathToSpreadsheetMap: { [key: string]: { url: string; title: string } } = {
        humantechweek: {
            url: "https://docs.google.com/spreadsheets/d/1jTKiF_7aHlqwNWQy94epgHhCNLiTdPcq/edit?usp=sharing&ouid=103820390436928978344&rtpof=true&sd=true",
            title: "Human Tech Week"
        },
        // Add more mappings here as needed
        // example: { url: "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit", title: "Event Name" },
    };

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
        // --- Identify URL type (Google Sheets vs Airtable) ---
        const isGoogleSheetUrl = url.startsWith(
            "https://docs.google.com/spreadsheets/"
        );
        const isAirtableUrl = url.startsWith("https://airtable.com/");

        if (!url || (!isGoogleSheetUrl && !isAirtableUrl)) {
            if (!isPrecache) {
                alert(
                    "Please enter a valid Google Sheets or Airtable shared view URL."
                );
            } else {
                console.warn(
                    "Invalid default sheet URL provided for precache.",
                    { url }
                );
            }
            return null; // Indicate failure early
        }

        // Map user-facing URL -> raw CSV download URL
        let csvUrl: string;
        if (isGoogleSheetUrl) {
            // Google Sheets export URL pattern
            csvUrl = url.replace(/\/edit.*$/, "/export?format=csv");
        } else {
            // For Airtable we delegate CSV conversion to the serverless proxy.
            csvUrl = url; // keep original link (shr… or viw…)
        }

        console.log("Fetching CSV from", csvUrl);
        setIsLoadingSpreadsheet(true);
        let parsedResult: { headers: string[]; rows: string[][] } | null = null;
        try {
            // For Airtable URLs route through our serverless relay to bypass CORS.
            const urlForFetch = isAirtableUrl
                ? `/api/airtableCsv?url=${encodeURIComponent(csvUrl)}`
                : csvUrl;

            const res = await fetch(urlForFetch);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("text/csv")) {
                // Something went wrong – probably HTML error page
                const errorText = await res.text();
                console.error(
                    "Expected CSV but received:",
                    errorText.slice(0, 500)
                );
                throw new Error(
                    "Response was not CSV – see console for details."
                );
            }

            const text = await res.text();
            parsedResult = parseData(text);
            if (parsedResult) {
                setData(parsedResult.headers, parsedResult.rows);
            } else {
                setData([], []);
                if (!isPrecache)
                    alert("Failed to parse the data from the source CSV.");
            }
        } catch (error) {
            console.error("Error fetching or parsing CSV", { csvUrl, error });
            if (!isPrecache) {
                alert(
                    `Failed to load data. Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
            setData([], []);
            parsedResult = null;
        } finally {
            setIsLoadingSpreadsheet(false);
        }
        return parsedResult;
    };

    // --- Effect Hook for Pre-caching and URL Path/Parameter Loading ---
    useEffect(() => {
        // Check for URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlFromParam = urlParams.get('url');
        
        if (urlFromParam) {
            // Validate that it's a Google Sheets or Airtable URL
            const isValidUrl = urlFromParam.startsWith("https://docs.google.com/spreadsheets/") || 
                              urlFromParam.startsWith("https://airtable.com/");
            
            if (isValidUrl) {
                console.log("Loading spreadsheet from URL parameter:", urlFromParam);
                setSheetUrl(urlFromParam);
                fetchAndSetDataFromUrl(urlFromParam, true);
            } else {
                console.warn("Invalid URL parameter - must be Google Sheets or Airtable URL");
            }
        } else {
            // Check for custom path in URL
            const path = window.location.pathname.substring(1); // Remove leading slash
            if (path && pathToSpreadsheetMap[path]) {
                const mapping = pathToSpreadsheetMap[path];
                console.log(`Loading spreadsheet for path "${path}":`, mapping.url);
                setSheetUrl(mapping.url);
                // Update the page title
                document.title = `${mapping.title} - Event Navigator`;
                fetchAndSetDataFromUrl(mapping.url, true);
            } else if (sheetUrl) {
                // Fetch data from the default URL when the component mounts
                console.log("Attempting to precache default sheet:", sheetUrl);
                fetchAndSetDataFromUrl(sheetUrl, true); // Pass true for isPrecache
            }
        }
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

    // Functions for shortlink modal
    const openShortlinkModal = () => {
        console.log("Opening shortlink modal, current sheetUrl:", sheetUrl);
        // Pre-populate with current sheet URL if available
        if (sheetUrl) {
            setShortlinkInput(sheetUrl);
        }
        setIsShortlinkModalOpen(true);
        console.log("Modal state set to:", true);
    };

    const closeShortlinkModal = () => {
        setIsShortlinkModalOpen(false);
        setShortlinkInput("");
        setGeneratedShortlink("");
        setShortlinkError("");
        setShowCopied(false);
    };

    const validateSpreadsheetUrl = (url: string): boolean => {
        return url.startsWith("https://docs.google.com/spreadsheets/") || 
               url.startsWith("https://airtable.com/");
    };

    const generateShortlink = () => {
        if (!shortlinkInput.trim()) {
            setShortlinkError("Please enter a URL");
            return;
        }

        if (!validateSpreadsheetUrl(shortlinkInput.trim())) {
            setShortlinkError("Please enter a valid Google Sheets or Airtable URL");
            return;
        }

        // Generate the shortlink
        const encodedUrl = encodeURIComponent(shortlinkInput.trim());
        const shortlink = `${window.location.origin}/?url=${encodedUrl}`;
        setGeneratedShortlink(shortlink);
        setShortlinkError("");
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedShortlink);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
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
                // Add the missing setData call for file uploads
                if (parsedResult) {
                    setData(parsedResult.headers, parsedResult.rows);
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
                    <h1>Find what you want at any event</h1>
                    <p>
                        Discover workshops, performances, talks, and gatherings
                        from any event schedule or spreadsheet.
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
                        <h2 className="text-lg font-semibold mb-2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {viewMode === "favorites"
                                ? "My Favorites"
                                : viewMode === "search"
                                ? "Search Results"
                                : "All Events"}
                            {viewMode === "search" && (
                                <button
                                    onClick={() => setViewMode("all")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "4px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "#6c757d",
                                        fontSize: "16px"
                                    }}
                                    title="Clear search and show all events"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </h2>
                        {/* DataTable */}
                        <DataTable /> {/* Moved DataTable inside */}
                        {/* Action Buttons Container */}
                        <div className="table-action-buttons" style={{
                            position: "absolute",
                            top: "0",
                            right: "0",
                            display: "flex",
                            gap: "10px",
                            zIndex: 10,
                            padding: "10px"
                        }}>
                            {/* Create Shortlink Button - only show if we have data loaded */}
                            {sheetUrl && (
                                <button
                                    type="button"
                                    onClick={openShortlinkModal}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 16px",
                                    backgroundColor: "white",
                                    border: "1px solid #dee2e6",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#495057",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease-in-out",
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                                    e.currentTarget.style.borderColor = "#adb5bd";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "white";
                                    e.currentTarget.style.borderColor = "#dee2e6";
                                }}
                            >
                                <Share2 size={18} />
                                <span>Create Shortlink</span>
                            </button>
                            )}
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
                                style={{
                                    position: "static",  // Override absolute positioning
                                    top: "auto",
                                    right: "auto"
                                }}
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

            {/* Shortlink Modal */}
            {isShortlinkModalOpen && (
                <div 
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 50
                    }}
                    onClick={closeShortlinkModal}
                >
                    <div 
                        style={{
                            backgroundColor: "white",
                            borderRadius: "8px",
                            padding: "24px",
                            maxWidth: "28rem",
                            margin: "0 16px",
                            width: "100%",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            position: "relative"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeShortlinkModal}
                            style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#6c757d",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "4px",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px" }}>Create Shareable Link</h2>
                        
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>Enter your spreadsheet URL:</label>
                            <input
                                type="text"
                                value={shortlinkInput}
                                onChange={(e) => {
                                    setShortlinkInput(e.target.value);
                                    setShortlinkError("");
                                    setGeneratedShortlink("");
                                }}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "1px solid #dee2e6",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            />
                            {shortlinkError && (
                                <p style={{ color: "#dc3545", fontSize: "0.875rem", marginTop: "4px" }}>{shortlinkError}</p>
                            )}
                        </div>

                        {!generatedShortlink && (
                            <button
                                onClick={generateShortlink}
                                style={{
                                    width: "100%",
                                    backgroundColor: "#cc5500",
                                    color: "white",
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    marginBottom: "16px",
                                    transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b34700"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#cc5500"}
                            >
                                Generate Link
                            </button>
                        )}

                        {generatedShortlink && (
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "8px" }}>Your shareable link:</label>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        value={generatedShortlink}
                                        readOnly
                                        style={{
                                            flex: 1,
                                            padding: "8px 12px",
                                            border: "1px solid #dee2e6",
                                            borderRadius: "6px",
                                            backgroundColor: "#f8f9fa",
                                            fontSize: "14px",
                                            boxSizing: "border-box"
                                        }}
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#e9ecef",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#dee2e6"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#e9ecef"}
                                        title="Copy to clipboard"
                                    >
                                        {showCopied ? (
                                            <>
                                                <Check size={20} style={{ color: "#28a745" }} />
                                                <span style={{ color: "#28a745" }}>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={20} />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
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
