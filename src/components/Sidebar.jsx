// src/components/Sidebar.jsx

import { Home, Package, ShoppingCart, History, Bell, BarChart3, LogOut, User } from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const NavItem = ({ icon, label, currentView, targetView, setView }) => (
    <button
        onClick={() => setView(targetView)}
        className={`flex items-center px-4 py-3 text-lg rounded-lg transition-colors w-full text-left ${
            currentView === targetView ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-100'
        }`}
    >
        {icon}
        <span className="ml-4">{label}</span>
    </button>
);

const Sidebar = ({ view, setView, user }) => {
    
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };
    
    return (
        <aside className="w-64 bg-white shadow-lg flex flex-col p-4">
            <div className="text-blue-700 font-bold text-2xl mb-4 p-2">
                Atlas Farma System
            </div>
            <div className="p-2 mb-4 border-y text-center">
                <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="font-semibold text-gray-800">{user.name || user.email}</p>
                <p className="text-sm text-white bg-blue-500 rounded-full px-2 py-0.5 inline-block capitalize">{user.role}</p>
            </div>
            <nav className="flex flex-col space-y-2 flex-grow">
                {/* Vistas para todos los roles logueados */}
                <NavItem icon={<Home size={24} />} label="Dashboard" currentView={view} targetView="dashboard" setView={setView} />
                <NavItem icon={<ShoppingCart size={24} />} label="Punto de Venta" currentView={view} targetView="pos" setView={setView} />
                <NavItem icon={<Bell size={24} />} label="Alertas" currentView={view} targetView="alerts" setView={setView} />
                <NavItem icon={<History size={24} />} label="Historial" currentView={view} targetView="history" setView={setView} />

                {/* Vistas solo para el admin */}
                {user.role === 'admin' && (
                    <>
                        <NavItem icon={<Package size={24} />} label="Inventario" currentView={view} targetView="inventory" setView={setView} />
                        <NavItem icon={<BarChart3 size={24} />} label="Reportes" currentView={view} targetView="reports" setView={setView} />
                    </>
                )}
            </nav>

            <div className="mt-auto">
                 <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 text-lg rounded-lg transition-colors w-full text-left text-red-600 hover:bg-red-100"
                >
                    <LogOut size={24} />
                    <span className="ml-4">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;