import React, { useMemo, useRef, useState, useCallback } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	ColumnDef,
	SortingState,
	ColumnSizingState,
	CellContext, // Import CellContext
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	ArrowUp,
	ArrowDown,
	ChevronsUpDown,
	GripVertical,
	Heart, // Import Heart icon
} from "lucide-react";
import { useData } from "../context/DataContext";
import { generateRowId } from "../utils/rowIdGenerator";
import ResizeOverlay from "./ResizeOverlay";
import useMediaQuery from "../hooks/useMediaQuery";
import CardList from "./CardList";
import "./DataTable.css";

const DataTable: React.FC = () => {
    const { headers, filteredRows, loading } = useData();
    const isMobile = useMediaQuery("(max-width: 768px)");

    // Common loading and message states
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

    // Switch between views
    return isMobile ? <CardList /> : <TableView />;
};

export default DataTable;

// The original DataTable component, renamed to TableView
const TableView: React.FC = () => {
    const {
        headers,
        filteredRows,
        favoriteIds,
        addFavorite,
        removeFavorite,
        uidColumnIndex,
    } = useData();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

    const validatedRows = useMemo(() => {
        if (!Array.isArray(filteredRows)) return [];
        return filteredRows.filter((row, index) => {
            if (!Array.isArray(row)) {
                console.warn(`Invalid row at index ${index}: not an array`);
                return false;
            }
            if (row.length !== headers.length) {
                console.warn(`Row ${index} has ${row.length} columns, expected ${headers.length}`);
                const adjustedRow = [...row];
                while (adjustedRow.length < headers.length) {
                    adjustedRow.push('');
                }
                if (adjustedRow.length > headers.length) {
                    adjustedRow.length = headers.length;
                }
                filteredRows[index] = adjustedRow;
            }
            return true;
        });
    }, [filteredRows, headers]);

    const calculateInitialSize = (headerText: string): number => {
        const baseSize = 120;
        const charWidth = 8;
        const padding = 40;
        const estimatedWidth = headerText.length * charWidth + padding;
        const dynamicBase = Math.max(baseSize, estimatedWidth * 0.6);
        let calculatedSize = Math.max(50, Math.max(dynamicBase, estimatedWidth * 0.8));
        if (headerText === "Description") {
            calculatedSize *= 3;
        }
        return Math.min(500, calculatedSize);
    };

    const getRowId = useCallback((row: string[], index: number): string => {
        return generateRowId(row, index, uidColumnIndex);
    }, [uidColumnIndex]);

    const actionsColumn: ColumnDef<string[]> = useMemo(
        () => ({
            id: "actions",
            header: () => <Heart size={24} />,
            size: 60,
            minSize: 60,
            maxSize: 60,
            enableResizing: false,
            meta: { flexGrow: 0 },
            cell: ({ row }: CellContext<string[], unknown>) => {
                const uid = getRowId(row.original, row.index);
                const isFavorited = favoriteIds.has(uid);
                const handleFavoriteClick = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    if (isFavorited) {
                        removeFavorite(uid);
                    } else {
                        addFavorite(uid);
                    }
                };
                return (
                    <div
                        onClick={handleFavoriteClick}
                        className={`favorite-icon-wrapper ${isFavorited ? "favorited" : ""}`}
                        role="button"
                        aria-pressed={isFavorited}
                        aria-label={isFavorited ? "Remove favorite" : "Add favorite"}
                        tabIndex={0}
                        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                            if (e.key === "Enter" || e.key === " ") {
                                handleFavoriteClick(e);
                            }
                        }}
                    >
                        <Heart size={24} className="favorite-icon" />
                    </div>
                );
            },
        }),
        [favoriteIds, addFavorite, removeFavorite, getRowId]
    );

    const dataColumns = useMemo<ColumnDef<string[]>[]>(() => {
        return headers.map((header, index) => {
            const size = calculateInitialSize(header);
            return {
                id: String(index),
                header: header,
                accessorFn: (row) => row[index],
                size: size,
                minSize: 50,
                maxSize: 500,
                meta: { flexGrow: size / 50 },
            };
        });
    }, [headers]);

    const columns = useMemo<ColumnDef<string[]>[]>(
        () => [actionsColumn, ...dataColumns],
        [actionsColumn, dataColumns]
    );

    const table = useReactTable({
        data: validatedRows,
        columns,
        columnResizeMode: "onChange",
        state: { sorting, columnSizing },
        onSortingChange: setSorting,
        onColumnSizingChange: setColumnSizing,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        defaultColumn: { minSize: 50, maxSize: 500 },
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        estimateSize: () => 40,
        getScrollElement: () => tableContainerRef.current,
        measureElement: (element) => element.getBoundingClientRect().height,
        overscan: 5,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();

    return (
        <div ref={tableContainerRef} className="table-container" style={{ position: 'relative' }}>
            <table className="data-table">
                <thead className="table-header">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    style={{
                                        width: header.getSize(),
                                        minWidth: header.column.columnDef.minSize || header.getSize(),
                                        flexGrow: header.column.columnDef.meta?.flexGrow || 0,
                                        flexShrink: 0,
                                        flexBasis: `${header.getSize()}px`
                                    }}
                                    className={`table-header-cell ${header.id === "actions" ? "sticky-col" : ""}`}
                                    colSpan={header.colSpan}
                                >
                                    <div
                                        className={`header-content ${header.column.getCanSort() ? "cursor-pointer select-none" : ""}`}
                                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        <span className="sort-icon">
                                            {{
                                                asc: <ArrowUp size={16} />,
                                                desc: <ArrowDown size={16} />,
                                            }[header.column.getIsSorted() as string] ??
                                                (header.column.getCanSort() ? <ChevronsUpDown size={16} /> : null)}
                                        </span>
                                    </div>
                                    <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={`resizer ${header.column.getIsResizing() ? "isResizing" : ""}`}
                                    >
                                        {header.column.getCanResize() && <GripVertical size={18} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="table-body" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                    {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const rowRef = rowVirtualizer.measureElement;
                        return (
                            <tr
                                key={row.id}
                                data-index={virtualRow.index}
                                ref={rowRef}
                                className={`table-row ${virtualRow.index % 2 ? "odd" : "even"}`}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        style={{
                                            width: cell.column.getSize(),
                                            minWidth: cell.column.columnDef.minSize || cell.column.getSize(),
                                            flexGrow: cell.column.columnDef.meta?.flexGrow || 0,
                                            flexShrink: 0,
                                            flexBasis: `${cell.column.getSize()}px`
                                        }}
                                        className={`table-cell ${cell.column.id === "actions" ? "sticky-col" : ""}`}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <ResizeOverlay table={table} containerRef={tableContainerRef} />
        </div>
    );
};
