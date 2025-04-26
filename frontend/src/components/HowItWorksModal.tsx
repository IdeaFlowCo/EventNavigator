import React from "react";
import { X, Info, Sheet, Search, Table, Code } from "lucide-react"; // Import necessary icons

// Define the props interface, including the onClose handler
interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
    isOpen,
    onClose,
}) => {
    // If the modal is not open, return null to render nothing
    if (!isOpen) {
        return null;
    }

    // Modal structure
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-title-section">
                        <Info size={24} className="modal-title-icon" />
                        <h2>How Event Navigator Works</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="modal-close-button"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>
                <p className="modal-subtitle">
                    Get answers from your event data quickly.
                </p>

                {/* Steps Section */}
                <div className="modal-steps">
                    {/* Step 1 */}
                    <div className="step">
                        <div className="step-icon-wrapper">
                            <Sheet size={24} />
                        </div>
                        <div className="step-text">
                            <h3>1. Provide Your Data</h3>
                            <p>
                                Either paste a Google Sheet URL or upload a
                                CSV/Excel file. You can drag and drop files
                                anywhere on the page.
                            </p>
                        </div>
                    </div>
                    {/* Step 2 */}
                    <div className="step">
                        <div className="step-icon-wrapper">
                            <Search size={24} />
                        </div>
                        <div className="step-text">
                            <h3>2. Ask a Question</h3>
                            <p>
                                Ask any question about the event listings in
                                plain English. For example: "Find all sound
                                camps near 9:00 & Esplanade", "What events are
                                happening on Tuesday night?", or "Show workshops
                                related to sustainability".
                            </p>
                        </div>
                    </div>
                    {/* Step 3 */}
                    <div className="step">
                        <div className="step-icon-wrapper">
                            <Table size={24} />
                        </div>
                        <div className="step-text">
                            <h3>3. Get Results</h3>
                            <p>
                                We'll analyze your data and show you the
                                matching rows in an easy-to-read table. You can
                                export the results to CSV.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pro Tips Section */}
                <div className="pro-tips-section">
                    <div className="pro-tips-title">
                        <Code size={20} />
                        <h4>Pro Tips</h4>
                    </div>
                    <ul>
                        <li>
                            Press Cmd+Enter (or Ctrl+Enter) to quickly submit
                            your query
                        </li>
                        <li>
                            Be specific in your questions to get more accurate
                            results
                        </li>
                        <li>
                            You can drag and drop files directly onto the page
                        </li>
                        <li>Event Navigator works with data in any language</li>
                    </ul>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="modal-got-it-button">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HowItWorksModal;
