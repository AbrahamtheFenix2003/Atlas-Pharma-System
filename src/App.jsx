import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import PointOfSale from './pages/PointOfSale';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Notification from './components/common/Notification';

function App() {
  const [view, setView] = useState('dashboard');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Función para mostrar notificaciones que pasaremos a otros componentes
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };
  
  const renderView = () => {
    const props = { showNotification }; // Pasamos la función como prop
    switch (view) {
      case 'dashboard': return <Dashboard {...props} />;
      case 'inventory': return <Inventory {...props} />;
      case 'pos': return <PointOfSale {...props} />;
      case 'history': return <SalesHistory {...props} />;
      case 'reports': return <Reports {...props} />;
      case 'alerts': return <Alerts {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {notification.show && (
        <Notification 
            message={notification.message} 
            type={notification.type}
            onClose={() => setNotification({ show: false, message: '', type: '' })}
        />
      )}
      <Sidebar view={view} setView={setView} />
      <main className={`flex-1 overflow-y-auto ${view !== 'pos' ? 'p-6' : ''}`}>
        {renderView()}
      </main>
    </div>
  );
}

export default App;