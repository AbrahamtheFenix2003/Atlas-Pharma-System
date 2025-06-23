import React, { useEffect } from 'react';

const Notification = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // La notificación desaparecerá después de 3 segundos

        return () => clearTimeout(timer);
    }, [onClose]);

    const baseStyle = "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 transition-transform transform-gpu animate-fade-in-down";
    const typeStyle = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`${baseStyle} ${typeStyle}`}>
            {message}
        </div>
    );
};

export default Notification;