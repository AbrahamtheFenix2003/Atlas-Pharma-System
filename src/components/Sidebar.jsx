import { Home, Package, ShoppingCart, History, Bell, BarChart3 } from 'lucide-react';

// Este es un componente anidado para cada item de la navegación
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

const Sidebar = ({ view, setView }) => {
    return (
        <aside className="w-64 bg-white shadow-lg flex flex-col p-4">
            <div className="text-blue-700 font-bold text-2xl mb-8 p-2">
                Atlas Farma System
            </div>
            <nav className="flex flex-col space-y-2">
                <NavItem icon={<Home size={24} />} label="Dashboard" currentView={view} targetView="dashboard" setView={setView} />
                <NavItem icon={<Package size={24} />} label="Inventario" currentView={view} targetView="inventory" setView={setView} />
                <NavItem icon={<ShoppingCart size={24} />} label="Punto de Venta" currentView={view} targetView="pos" setView={setView} />
                <NavItem icon={<History size={24} />} label="Historial" currentView={view} targetView="history" setView={setView} />
                <NavItem icon={<BarChart3 size={24} />} label="Reportes" currentView={view} targetView="reports" setView={setView} />
                <NavItem icon={<Bell size={24} />} label="Alertas" currentView={view} targetView="alerts" setView={setView} />
            </nav>
        </aside>
    );
};

export default Sidebar;