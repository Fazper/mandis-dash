import { useEffect, useRef, useCallback } from 'react';

export default function Modal({ children, onClose, className = '' }) {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);

    // Handle ESC key press
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // Handle click outside
    const handleOverlayClick = useCallback((e) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        // Add event listener for ESC key
        document.addEventListener('keydown', handleKeyDown);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Focus trap - focus the modal content
        if (contentRef.current) {
            contentRef.current.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    return (
        <div
            ref={overlayRef}
            className="modal-overlay"
            onClick={handleOverlayClick}
        >
            <div
                ref={contentRef}
                className={`modal-content ${className}`}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
            >
                {children}
            </div>
        </div>
    );
}
