// src/App.jsx

import { useState, useEffect } from 'react';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import Login from './pages/Login';
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
  
  const [user, setUser] = useState(null); 
  const [loadingAuth, setLoadingAuth] = useState(true);

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
          console.error("Usuario autenticado pero sin perfil en Firestore. Deslogueando.");
          showNotification('Tu usuario no tiene un rol asignado. Contacta al administrador.', 'error');
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
      default: return <Dashboard {...props} />;
    }
  };
  
  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }
  
  if (!user) {
    return <Login showNotification={showNotification} />;
  }
  
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {notification.show && (
        <Notification 
            message={notification.message} 
            type={notification.type}
            onClose={() => setNotification({ show: false, message: '', type: '' })}
        />
      )}
      <Sidebar view={view} setView={setView} user={user} />
      <main className={`flex-1 overflow-y-auto ${view !== 'pos' ? 'p-6' : ''}`}>
        {renderView()}
      </main>
    </div>
  );
}

export default App;