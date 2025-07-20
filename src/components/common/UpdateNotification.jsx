import { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setShowUpdate(true);
                }
              });
            }
          });
        } catch (error) {
          console.error('Error al registrar service worker:', error);
        }
      }
    };

    registerSW();

    // Escuchar mensajes del service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setShowUpdate(true);
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      waitingWorker.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">
            🚀 Actualización Disponible
          </h4>
          <p className="text-xs opacity-90 mb-3">
            Una nueva versión de la aplicación está disponible.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              Actualizar ahora
            </button>
            <button
              onClick={handleDismiss}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-400 transition-colors"
            >
              Recordar más tarde
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 text-white hover:text-gray-200 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;
