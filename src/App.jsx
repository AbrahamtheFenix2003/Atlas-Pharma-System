// src/App.jsx

import { useState, useEffect } from 'react';
import { auth, db } from './firebase/config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Componentes
import Login from './pages/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Notification from './components/common/Notification.jsx';

// Páginas
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import PointOfSale from './pages/PointOfSale.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import Reports from './pages/Reports.jsx';
import Alerts from './pages/Alerts.jsx';
import CashRegister from './pages/CashRegister.jsx';

function App() {
  const [view, setView] = useState('dashboard');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [user, setUser] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState('');
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (auth_user) => {
      if (auth_user) {
        const userDocRef = doc(db, 'users', auth_user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userProfile = { uid: auth_user.uid, ...userDoc.data() };
          setUser(userProfile);
          if (userProfile.role === 'vendedor') {
            setView('dashboard');
          }
        } else {
          setLoginError('Tu usuario no tiene un rol asignado.');
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };
  
  const renderView = () => {
    const props = { showNotification, user }; 
    const vendedorViews = ['dashboard', 'pos', 'alerts', 'history'];

    if (user && user.role === 'vendedor' && !vendedorViews.includes(view)) {
      return <Dashboard {...props} />;
    }
    
    switch (view) {
      case 'dashboard': return <Dashboard {...props} />;
      case 'inventory': return <Inventory {...props} />;
      case 'pos': return <PointOfSale {...props} />;
      case 'history': return <SalesHistory {...props} />;
      case 'reports': return <Reports {...props} />;
      case 'alerts': return <Alerts {...props} />;
      case 'cash-register': return <CashRegister {...props} />;
      default: return <Dashboard {...props} />;
    }
  };
  
  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }
  
  if (!user) {
    return <Login initialError={loginError} />;
  }
  
  return (
    <div className="h-screen bg-gray-100 font-sans md:flex">
      <Sidebar 
        view={view} 
        setView={setView} 
        user={user} 
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          viewTitle={view}
        />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>

      {notification.show && (
        <Notification 
            message={notification.message} 
            type={notification.type}
            onClose={() => setNotification({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  );
}

export default App;
