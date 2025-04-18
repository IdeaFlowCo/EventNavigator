import React, { useRef, ChangeEvent, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Search,
    Link as LinkIcon,
    Upload as UploadIcon,
    X,
    FileText,
} from "lucide-react";

// Props for the QuerySection component
interface QuerySectionProps {
    query: string;
    sheetUrl: string;
    file: File | null;
    fileName: string | null;
    isLoading: boolean;
    isLoadingSpreadsheet: boolean;
    activeTab: "url" | "upload";
    aboutMe: string;
    onQueryChange: (value: string) => void;
    onSheetUrlChange: (value: string) => void;
    onFileChange: (file: File | null) => void;
    onTabChange: (value: "url" | "upload") => void;
    onAboutMeChange: (value: string) => void;
    onSubmit: () => void;
}

function QuerySection({
    query,
    sheetUrl,
    file,
    fileName,
    isLoading,
    isLoadingSpreadsheet,
    activeTab,
    aboutMe,
    onQueryChange,
    onSheetUrlChange,
    onFileChange,
    onTabChange,
    onAboutMeChange,
    onSubmit,
}: QuerySectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryInputRef = useRef<HTMLInputElement>(null);
    const urlInputRef = useRef<HTMLInputElement>(null);
    const queryUploadInputRef = useRef<HTMLInputElement>(null);

    // Handle cmd/ctrl+enter to submit
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                const canSubmit =
                    activeTab === "url"
                        ? query &&
                          sheetUrl &&
                          (!isLoading || isLoadingSpreadsheet)
                        : query && file && (!isLoading || isLoadingSpreadsheet);

                if (canSubmit) {
                    onSubmit();
                }
            }
        },
        [
            activeTab,
            query,
            sheetUrl,
            file,
            isLoading,
            isLoadingSpreadsheet,
            onSubmit,
        ]
    );

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);

            if (queryUploadInputRef.current && !query) {
                queryUploadInputRef.current.focus();
            }
        } else {
            onFileChange(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);

            if (queryUploadInputRef.current && !query) {
                queryUploadInputRef.current.focus();
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    // Auto trim whitespace from inputs
    const handleQueryChange = (value: string) => {
        onQueryChange(value.trimStart());
    };

    const handleAboutMeChange = (value: string) => {
        onAboutMeChange(value.trimStart());
    };

    const handleUrlChange = (value: string) => {
        onSheetUrlChange(value.trim());
    };

    // Function to clear the query text
    const clearQuery = useCallback(() => {
        setTimeout(() => {
            onQueryChange("");
            if (activeTab === "url" && queryInputRef.current) {
                queryInputRef.current.focus();
            } else if (activeTab === "upload" && queryUploadInputRef.current) {
                queryUploadInputRef.current.focus();
            }
        }, 0);
    }, [activeTab, onQueryChange]);

    // Clear the selected file (Added previously for Tailwind version, useful here too)
    const clearFile = useCallback(() => {
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
    }, [onFileChange]);

    // Determine if the submit button should be disabled
    const isSubmitDisabled =
        isLoading ||
        isLoadingSpreadsheet || // Disable if any loading is happening
        (activeTab === "url" && !sheetUrl) || // Still require URL if URL tab is active
        (activeTab === "upload" && !file); // Still require File if Upload tab is active

    return (
        // Apply class name for Query Section container
        <div className="query-section-container">
            <Tabs
                value={activeTab}
                onValueChange={(value) =>
                    onTabChange(value as "url" | "upload")
                }
            >
                {/* Apply class name for Tabs List */}
                <TabsList className="tabs-list">
                    {/* TabsTrigger uses data attributes for styling, no className needed */}
                    <TabsTrigger value="url">
                        <LinkIcon
                            width={16}
                            height={16}
                            style={{ marginRight: "8px" }}
                        />
                        Google Sheet URL
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                        <UploadIcon
                            width={16}
                            height={16}
                            style={{ marginRight: "8px" }}
                        />
                        Upload File
                    </TabsTrigger>
                </TabsList>

                {/* Apply class name for Tab Content */}
                <TabsContent value="url" className="tab-content">
                    {/* Container for all inputs */}
                    <div className="input-section-wrapper">
                        {/* About Me Input Group (Full Width) */}
                        <div className="input-group about-me-group">
                            <Label htmlFor="about-me">
                                About me (optional)
                            </Label>
                            <Input
                                id="about-me"
                                value={aboutMe}
                                onChange={(e) =>
                                    handleAboutMeChange(e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                placeholder="e.g., loves techno, prefers sober parties"
                            />
                        </div>

                        {/* Container for the two side-by-side inputs */}
                        <div className="two-column-inputs">
                            {/* What are you looking for? Input Group */}
                            <div className="input-group">
                                <Label htmlFor="query">
                                    What are you looking for?
                                </Label>
                                <div className="query-input-wrapper">
                                    <Input
                                        id="query"
                                        ref={queryInputRef}
                                        value={query}
                                        onChange={(e) =>
                                            handleQueryChange(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., sound camps near 8:00 & E"
                                        autoFocus
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={clearQuery}
                                            className="clear-query-button"
                                            aria-label="Clear query"
                                        >
                                            <X width={16} height={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Google Sheet URL Input Group */}
                            <div className="input-group">
                                <Label htmlFor="sheet-url">
                                    Google Sheet URL
                                </Label>
                                <Input
                                    id="sheet-url"
                                    ref={urlInputRef}
                                    value={sheetUrl}
                                    onChange={(e) =>
                                        handleUrlChange(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                />
                            </div>
                        </div>

                        {/* Submit Button Area */}
                        <div className="submit-area">
                            <Button
                                onClick={onSubmit}
                                disabled={isSubmitDisabled}
                                className="submit-button"
                            >
                                {isLoading ? (
                                    <Loader2
                                        width={16}
                                        height={16}
                                        className="spinner"
                                    />
                                ) : (
                                    <Search width={16} height={16} />
                                )}
                                Go
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Apply class name for Tab Content */}
                <TabsContent value="upload" className="tab-content">
                    {/* Container for all inputs */}
                    <div className="input-section-wrapper">
                        {/* About Me Input Group (Full Width) */}
                        <div className="input-group about-me-group">
                            <Label htmlFor="about-me-upload">
                                About me (optional)
                            </Label>
                            <Input
                                id="about-me-upload"
                                value={aboutMe}
                                onChange={(e) =>
                                    handleAboutMeChange(e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                placeholder="e.g., loves techno, prefers sober parties"
                            />
                        </div>

                        {/* Container for the two side-by-side inputs */}
                        <div className="two-column-inputs">
                            {/* What are you looking for? Input Group */}
                            <div className="input-group">
                                <Label htmlFor="query-upload">
                                    What are you looking for?
                                </Label>
                                <div className="query-input-wrapper">
                                    <Input
                                        id="query-upload"
                                        ref={queryUploadInputRef}
                                        value={query}
                                        onChange={(e) =>
                                            handleQueryChange(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="e.g., sound camps near 8:00 & E"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={clearQuery}
                                            className="clear-query-button"
                                            aria-label="Clear query"
                                        >
                                            <X width={16} height={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* File Upload Input Group */}
                            <div className="input-group">
                                <Label htmlFor="file-upload">
                                    Upload File (.csv, .xls, .xlsx)
                                </Label>
                                {!file ? (
                                    <div
                                        className="file-upload-area"
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <div className="file-upload-content">
                                            <UploadIcon />
                                            <p>
                                                <span className="upload-link">
                                                    Upload a file
                                                </span>{" "}
                                                or drag and drop
                                            </p>
                                            <p className="file-types">
                                                CSV, XLS, XLSX up to 10MB
                                            </p>
                                        </div>
                                        <input
                                            id="file-upload"
                                            ref={fileInputRef}
                                            type="file"
                                            className="sr-only"
                                            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                ) : (
                                    <div className="file-display-area">
                                        <div className="file-info">
                                            <FileText />
                                            <span title={fileName || ""}>
                                                {fileName}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearFile}
                                            className="clear-file-button"
                                            aria-label="Remove file"
                                        >
                                            <X width={16} height={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Submit Button Area */}
                        <div className="submit-area">
                            <Button
                                onClick={onSubmit}
                                disabled={isSubmitDisabled}
                                className="submit-button"
                            >
                                {isLoading ? (
                                    <Loader2
                                        width={16}
                                        height={16}
                                        className="spinner"
                                    />
                                ) : (
                                    <Search width={16} height={16} />
                                )}
                                Go
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            {/* Analysis Loading Indicator - Add class name */}
            {isLoading && !isLoadingSpreadsheet && (
                <div className="analysis-loader">
                    <Loader2 width={20} height={20} className="spinner" />
                    <span>Analyzing your data...</span>
                </div>
            )}
        </div>
    );
}

export default QuerySection;
