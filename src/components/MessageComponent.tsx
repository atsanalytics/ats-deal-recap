import React from 'react';

export type MessageType = 'success' | 'error' | 'info' | 'warning';

interface MessageComponentProps {
    type: MessageType;
    title: string;
    message: string;
    onClose?: () => void;
    autoClose?: boolean;
    duration?: number; // in milliseconds
}

const MessageComponent: React.FC<MessageComponentProps> = ({
    type,
    title,
    message,
    onClose,
    autoClose = true,
    duration = 5000
}) => {
    React.useEffect(() => {
        if (autoClose && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [autoClose, onClose, duration]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return 'ℹ';
        }
    };

    const getClassName = () => {
        return `message-component message-${type}`;
    };

    return (
        <div className={getClassName()}>
            <div className="message-header">
                <span className="message-icon">{getIcon()}</span>
                <span className="message-title">{title}</span>
                {onClose && (
                    <button 
                        className="message-close" 
                        onClick={onClose}
                        aria-label="Close message"
                    >
                        ×
                    </button>
                )}
            </div>
            <div className="message-content">
                <p>{message}</p>
            </div>
        </div>
    );
};

export default MessageComponent;
