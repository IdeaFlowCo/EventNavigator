import React, { useMemo, useRef, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnSizingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUp, ArrowDown, ChevronsUpDown, GripVertical } from "lucide-react";
import { useData } from "../context/DataContext";
import "./DataTable.css";

const DataTable: React.FC = () => {
    const { headers, filteredRows, loading } = useData();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

    // Function to estimate initial size based on header length
    const calculateInitialSize = (headerText: string): number => {
        const baseSize = 120; // Base width for shorter headers
        const charWidth = 8; // Estimated pixels per character
        const padding = 40; // Padding for sort icon, resizer, etc.
        const estimatedWidth = headerText.length * charWidth + padding;
        // Use a larger base size if the estimated width is significant
        const dynamicBase = Math.max(baseSize, estimatedWidth * 0.6); // Bias towards wider if header is long
        let calculatedSize = Math.max(
            50,
            Math.max(dynamicBase, estimatedWidth * 0.8)
        );

        // Special case for 'Description' column
        if (headerText === "Description") {
            calculatedSize *= 3; // Make it triple wide
        }

        // Clamp between min/max
        return Math.min(500, calculatedSize);
    };

    const columns = useMemo<ColumnDef<string[]>[]>(() => {
        return headers.map((header, index) => ({
            id: String(index),
            header: header,
            accessorFn: (row) => row[index],
            size: calculateInitialSize(header), // Calculate initial size dynamically (includes Description logic)
            minSize: 50, // Minimum size
            maxSize: 500, // Maximum size (Description will be capped at this)
        }));
    }, [headers]);

    const table = useReactTable({
        data: filteredRows,
        columns,
        columnResizeMode: "onChange", // Enable resizing
        state: {
            sorting,
            columnSizing,
        },
        onSortingChange: setSorting,
        onColumnSizingChange: setColumnSizing, // Update state on resize
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        // Default column definition (can be simpler now size is dynamic)
        defaultColumn: {
            minSize: 50,
            maxSize: 500,
        },
    });

    const { rows } = table.getRowModel(); // Use getRowModel() which respects sorting

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        estimateSize: () => 40,
        getScrollElement: () => tableContainerRef.current,
        measureElement: (element) => element.getBoundingClientRect().height,
        overscan: 5,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();

    if (loading) {
        return (
            <div className="loading-indicator">
                <div className="spinner"></div>
                finding results...
            </div>
        );
    }

    if (!loading && filteredRows.length === 0 && headers.length > 0) {
        return (
            <div className="message-indicator">
                No results found for your query.
            </div>
        );
    }

    if (headers.length === 0) {
        return (
            <div className="message-indicator">
                Load data using the options above.
            </div>
        );
    }

    return (
        <div ref={tableContainerRef} className="table-container">
            <table className="data-table">
                <thead className="table-header">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    style={{ width: header.getSize() }}
                                    className="table-header-cell"
                                    colSpan={header.colSpan}
                                >
                                    <div
                                        className="header-content"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                        <span className="sort-icon">
                                            {{
                                                asc: <ArrowUp size={16} />,
                                                desc: <ArrowDown size={16} />,
                                            }[
                                                header.column.getIsSorted() as string
                                            ] ??
                                                (header.column.getCanSort() ? (
                                                    <ChevronsUpDown size={16} />
                                                ) : null)}
                                        </span>
                                    </div>
                                    {/* Resize Handle */}
                                    <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={`resizer ${
                                            header.column.getIsResizing()
                                                ? "isResizing"
                                                : ""
                                        }`}
                                    >
                                        <GripVertical size={18} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody
                    className="table-body"
                    style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                    {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const rowRef = rowVirtualizer.measureElement;
                        return (
                            <tr
                                key={row.id}
                                data-index={virtualRow.index}
                                ref={rowRef}
                                className={`table-row ${
                                    virtualRow.index % 2 ? "odd" : "even"
                                }`}
                                style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        style={{ width: cell.column.getSize() }}
                                        className="table-cell"
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
