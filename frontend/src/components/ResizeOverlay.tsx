import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table } from '@tanstack/react-table';
import './ResizeOverlay.css';

interface ResizeOverlayProps {
    table: Table<any>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

interface HandlePosition {
    columnId: string;
    left: number;
    isVisible: boolean;
}

const ResizeOverlay: React.FC<ResizeOverlayProps> = ({ table, containerRef }) => {
    const [handlePositions, setHandlePositions] = useState<HandlePosition[]>([]);
    const [containerHeight, setContainerHeight] = useState(0);
    const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    // Calculate column positions based on table state
    const calculatePositions = useCallback(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        // Get all header cells from the actual DOM
        const headerCells = container.querySelectorAll('.table-header-cell');
        const positions: HandlePosition[] = [];
        
        // Get all columns that can be resized
        const columns = table.getAllColumns();
        
        headerCells.forEach((headerCell, index) => {
            const column = columns[index];
            if (!column || !column.getCanResize()) return;
            
            // Get the actual DOM position of the header cell
            const cellRect = headerCell.getBoundingClientRect();
            // Subtract 1px to align with the border (cells have 1px right border)
            const rightEdgePosition = cellRect.right - containerRect.left - 1;
            
            // Check if this handle is within the visible area
            const isVisible = rightEdgePosition > -20 && rightEdgePosition < containerRect.width + 20;
            
            positions.push({
                columnId: column.id,
                left: rightEdgePosition,
                isVisible
            });
        });

        setHandlePositions(positions);
    }, [table, containerRef]);

    // Update container height
    const updateContainerHeight = useCallback(() => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const height = container.offsetHeight;
        setContainerHeight(height);
    }, [containerRef]);

    // Handle scroll synchronization
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        
        // Cancel any pending animation frame
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        
        // Use requestAnimationFrame for smooth updates
        rafRef.current = requestAnimationFrame(() => {
            calculatePositions();
        });
    }, [calculatePositions, containerRef]);

    // Mouse event handlers for resize
    const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const column = table.getColumn(columnId);
        if (!column || !containerRef.current) return;
        
        setActiveColumnId(columnId);
        
        const startX = e.clientX;
        const startWidth = column.getSize();
        const minSize = column.columnDef.minSize || 50;
        const maxSize = column.columnDef.maxSize || 500;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(minSize, Math.min(maxSize, startWidth + deltaX));
            
            // Use the table's column sizing API
            table.setColumnSizing(prev => ({
                ...prev,
                [columnId]: newWidth
            }));
        };
        
        const handleMouseUp = () => {
            setActiveColumnId(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            
            // Recalculate positions after resize ends
            calculatePositions();
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    }, [table, containerRef, calculatePositions]);

    // Touch event handlers
    const handleTouchStart = useCallback((e: React.TouchEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const column = table.getColumn(columnId);
        if (!column || !containerRef.current) return;
        
        setActiveColumnId(columnId);
        
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startWidth = column.getSize();
        const minSize = column.columnDef.minSize || 50;
        const maxSize = column.columnDef.maxSize || 500;
        
        const handleTouchMove = (moveEvent: TouchEvent) => {
            moveEvent.preventDefault(); // Prevent scrolling while resizing
            const touch = moveEvent.touches[0];
            const deltaX = touch.clientX - startX;
            const newWidth = Math.max(minSize, Math.min(maxSize, startWidth + deltaX));
            
            table.setColumnSizing(prev => ({
                ...prev,
                [columnId]: newWidth
            }));
        };
        
        const handleTouchEnd = () => {
            setActiveColumnId(null);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            
            calculatePositions();
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }, [table, containerRef, calculatePositions]);

    // Set up observers and event listeners
    useEffect(() => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        
        // Initial calculations
        calculatePositions();
        updateContainerHeight();
        
        // Set up resize observer for container size changes
        const resizeObserver = new ResizeObserver(() => {
            updateContainerHeight();
            calculatePositions();
        });
        
        resizeObserver.observe(container);
        
        // Set up scroll listener
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        // Set up mutation observer for table structure changes
        const mutationObserver = new MutationObserver(() => {
            calculatePositions();
        });
        
        mutationObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
        
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            container.removeEventListener('scroll', handleScroll);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [containerRef, calculatePositions, updateContainerHeight, handleScroll]);

    // Listen for column sizing changes
    useEffect(() => {
        calculatePositions();
    }, [table.getState().columnSizing, calculatePositions]);

    return (
        <div 
            ref={overlayRef}
            className="resize-overlay"
            style={{ height: containerHeight }}
        >
            {handlePositions.map((position) => (
                position.isVisible && (
                    <div
                        key={position.columnId}
                        className={`resize-handle ${activeColumnId === position.columnId ? 'active' : ''}`}
                        style={{
                            left: position.left
                        }}
                        onMouseDown={(e) => handleMouseDown(e, position.columnId)}
                        onTouchStart={(e) => handleTouchStart(e, position.columnId)}
                    >
                        <div className="resize-handle-line" />
                    </div>
                )
            ))}
        </div>
    );
};

export default ResizeOverlay;