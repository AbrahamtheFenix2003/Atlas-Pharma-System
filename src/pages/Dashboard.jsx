import React, { useState, useEffect } from 'react';
import StatCard from '../components/common/StatCard';
import { Package, ShoppingCart, Bell } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({ products: 0, lowStock: 0, expiringSoon: 0, salesToday: 0 });
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Oyente para Productos Maestros
        const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
            setStats(prev => ({...prev, products: snapshot.size}));
        });
        
        // 2. Oyente para Lotes (Alertas)
        const lotsQuery = query(collection(db, "productLots"), where("isActive", "==", true));
        const unsubLots = onSnapshot(lotsQuery, (snapshot) => {
            let lowStockCount = 0;
            let expiringSoonCount = 0;
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            snapshot.forEach(doc => {
                const lot = doc.data();
                if (lot.stock > 0 && lot.stock <= lot.lowStockThreshold) lowStockCount++;
                if (lot.expiryDate && lot.expiryDate.toDate() < thirtyDaysFromNow) expiringSoonCount++;
            });
            setStats(prev => ({ ...prev, lowStock: lowStockCount, expiringSoon: expiringSoonCount }));
            setLoading(false);
        });

        // 3. Oyente para Ventas de Hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const salesQuery = query(collection(db, "sales"), where("date", ">=", today));
        const unsubSales = onSnapshot(salesQuery, (snapshot) => {
            setStats(prev => ({ ...prev, salesToday: snapshot.size }));
        });
        
        // 4. Carga de datos para el gráfico
        const fetchSalesForChart = async () => {
             const sevenDaysAgo = new Date();
             sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
             sevenDaysAgo.setHours(0,0,0,0);
             
             const qSalesLast7Days = query(collection(db, "sales"), where("date", ">=", sevenDaysAgo));
             const querySnapshot = await getDocs(qSalesLast7Days);
             
             const salesByDay = {};
             // Inicializar los últimos 7 días con 0 ventas
             for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayString = d.toLocaleDateString('es-ES', { weekday: 'short' });
                salesByDay[dayString] = { name: dayString, ventas: 0 };
             }

             querySnapshot.forEach(doc => {
                 const sale = doc.data();
                 const saleDate = sale.date.toDate();
                 const dayString = saleDate.toLocaleDateString('es-ES', { weekday: 'short' });
                 if(salesByDay[dayString]) {
                    salesByDay[dayString].ventas += sale.total;
                 }
             });
            // Ordenar los días correctamente
             setSalesData(Object.values(salesByDay).reverse());
        };

        fetchSalesForChart();

        return () => { unsubProducts(); unsubLots(); unsubSales(); };
    }, []);

    if (loading) {
        return <div className="p-10 text-center">Cargando dashboard...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel de Control</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Productos Maestros" value={stats.products} icon={<Package size={24} className="text-white"/>} color="bg-blue-500" />
                <StatCard title="Ventas de Hoy" value={stats.salesToday} icon={<ShoppingCart size={24} className="text-white"/>} color="bg-green-500" />
                <StatCard title="Lotes con Bajo Stock" value={stats.lowStock} icon={<Bell size={24} className="text-white"/>} color="bg-yellow-500" />
                <StatCard title="Lotes Próximos a Vencer" value={stats.expiringSoon} icon={<Bell size={24} className="text-white"/>} color="bg-red-500" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Ventas de los Últimos 7 Días</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="ventas" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
export default Dashboard;