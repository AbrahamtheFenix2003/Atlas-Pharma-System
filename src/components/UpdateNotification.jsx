import { useEffect, useState } from 'react';

const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Registrar service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('[App] Service Worker registrado:', reg);
          setRegistration(reg);

          // Verificar actualizaciones cada 30 segundos
          setInterval(() => {
            reg.update();
          }, 30000);

          // Escuchar cuando hay una nueva versión esperando
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[App] Nueva versión disponible');
                  setShowUpdate(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[App] Error registrando Service Worker:', err);
        });

      // Escuchar mensajes del service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_UPDATE') {
          console.log('[App] Recibido mensaje de actualización');
          setShowUpdate(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-700">
        <div className="flex items-start justify-between">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-200" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium">
                ¡Nueva versión disponible!
              </p>
              <p className="mt-1 text-sm text-blue-200">
                Hay mejoras y correcciones disponibles
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors"
                >
                  Actualizar ahora
                </button>
                <button
                  onClick={handleDismiss}
                  className="bg-transparent hover:bg-blue-700 text-blue-200 hover:text-white text-xs font-medium py-1.5 px-3 rounded border border-blue-500 transition-colors"
                >
                  Después
                </button>
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-blue-200 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Cerrar</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
