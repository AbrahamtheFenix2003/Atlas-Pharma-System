// src/components/Sidebar.jsx

import React, { useState, useEffect } from 'react';
import { Home, Package, ShoppingCart, History, Bell, BarChart3, LogOut, User, ChevronsLeft, ChevronsRight, Landmark, FileText } from 'lucide-react';
import { auth, db } from '../firebase/config.js';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const NavItem = ({ icon, label, currentView, targetView, setView, setIsOpen, isCollapsed, alertCount = 0 }) => (
    <button
        onClick={() => {
            setView(targetView);
            setIsOpen(false); // Cierra el menú al navegar
        }}
        title={isCollapsed ? label : ''}
        className={`flex items-center px-4 py-3 text-lg rounded-lg transition-colors w-full text-left relative
                   ${currentView === targetView ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-100'}
                   ${isCollapsed ? 'md:justify-center' : ''}`}
    >
        <div className="relative">
            {icon}
            {alertCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {alertCount > 99 ? '99+' : alertCount}
                </span>
            )}
        </div>
        <span className={`ml-4 ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
    </button>
);

const Sidebar = ({ view, setView, user, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
    const [alertsCount, setAlertsCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        
        const lotsQuery = query(collection(db, "productLots"), where("isActive", "==", true));
        const unsubscribe = onSnapshot(lotsQuery, (snapshot) => {
            let totalAlerts = 0;
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            snapshot.forEach(doc => {
                const lot = { id: doc.id, ...doc.data() };
                
                // Contar productos vencidos
                if (lot.expiryDate && lot.expiryDate.toDate() < today) {
                    totalAlerts++;
                    return;
                }
                
                // Contar bajo stock
                if (lot.stock > 0 && lot.stock <= lot.lowStockThreshold) {
                    totalAlerts++;
                }
                
                // Contar próximos a vencer
                if (lot.expiryDate && lot.expiryDate.toDate() < thirtyDaysFromNow && lot.expiryDate.toDate() >= today) {
                    totalAlerts++;
                }
            });
            
            setAlertsCount(totalAlerts);
        });
        
        return () => unsubscribe();
    }, [user]);
    
    const handleLogout = async () => {
        setIsOpen(false);
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };
    
    return (
      <>
        {/* Overlay para el fondo oscuro en móvil */}
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isOpen ? 'block' : 'hidden'}`}
          onClick={() => setIsOpen(false)}
        ></div>

        <aside className={`fixed top-0 left-0 h-full bg-white shadow-lg flex flex-col z-30
                           transform transition-all duration-300 ease-in-out 
                           md:relative md:translate-x-0 
                           ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                           ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
        >
            <div className={`font-bold text-2xl mb-4 p-2 text-blue-700 flex items-center ${isCollapsed ? 'md:justify-center' : 'md:justify-start'}`}>
                <Package size={32} />
                <span className={`ml-2 ${isCollapsed ? 'md:hidden' : ''}`}>Atlas</span>
            </div>

            <div className={`p-2 mb-4 border-y text-center ${isCollapsed ? 'md:hidden' : ''}`}>
                <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="font-semibold text-gray-800">{user.name || user.email}</p>
                <p className="text-sm text-white bg-blue-500 rounded-full px-2 py-0.5 inline-block capitalize">{user.role}</p>
            </div>
            
            <nav className="flex flex-col space-y-2 flex-grow overflow-y-auto">
                <NavItem icon={<Home size={24} />} label="Dashboard" currentView={view} targetView="dashboard" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                <NavItem icon={<ShoppingCart size={24} />} label="Punto de Venta" currentView={view} targetView="pos" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                <NavItem icon={<Bell size={24} />} label="Alertas" currentView={view} targetView="alerts" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} alertCount={alertsCount} />
                <NavItem icon={<History size={24} />} label="Historial" currentView={view} targetView="history" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                <NavItem icon={<Landmark size={24} />} label="Caja" currentView={view} targetView="cash-register" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                <NavItem icon={<FileText size={24} />} label="Historial de Cajas" currentView={view} targetView="cash-history" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />

                {user.role === 'admin' && (
                    <>
                        <NavItem icon={<Package size={24} />} label="Inventario" currentView={view} targetView="inventory" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                        <NavItem icon={<BarChart3 size={24} />} label="Reportes" currentView={view} targetView="reports" setView={setView} setIsOpen={setIsOpen} isCollapsed={isCollapsed} />
                    </>
                )}
            </nav>

            <div className="mt-auto border-t pt-2 shrink-0">
                 <button
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className={`flex items-center px-4 py-3 text-lg rounded-lg transition-colors w-full text-left text-red-600 hover:bg-red-100 ${isCollapsed ? 'md:justify-center' : ''}`}
                >
                    <LogOut size={24} />
                    <span className={`ml-4 ${isCollapsed ? 'md:hidden' : ''}`}>Salir</span>
                </button>
                
                 <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex items-center justify-center w-full px-4 py-2 text-gray-500 hover:bg-gray-200"
                    title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
                >
                    {isCollapsed ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
                </button>
            </div>
        </aside>
      </>
    );
};

export default Sidebar;