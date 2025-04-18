import React, { useMemo, useRef } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useData } from "../context/DataContext";
import "./DataTable.css";

const DataTable: React.FC = () => {
    const { headers, filteredRows, loading } = useData();
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo<ColumnDef<string[]>[]>(() => {
        return headers.map((header, index) => ({
            id: String(index),
            header: header,
            accessorFn: (row) => row[index],
            size: 160,
        }));
    }, [headers]);

    const table = useReactTable({
        data: filteredRows,
        columns,
        getCoreRowModel: getCoreRowModel(),
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
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
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
