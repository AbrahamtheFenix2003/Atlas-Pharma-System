import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import { DollarSign, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../components/common/Modal';

// Tooltip para el gráfico de ganancias
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">{`${label}`}</p>
        <p className="text-sm text-red-600">{`Costo de Ventas: S/ ${data.cost.toFixed(2)}`}</p>
        <p className="text-sm text-blue-600">{`Ingreso Total: S/ ${data.revenue.toFixed(2)}`}</p>
        <p className="text-sm text-green-600 font-bold">{`Ganancia Neta: S/ ${data.profit.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

const Reports = ({ showNotification }) => {
    const [allSales, setAllSales] = useState([]);
    const [allLots, setAllLots] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('month');
    const [showSalesResetConfirm, setShowSalesResetConfirm] = useState(false);
    const [showProductResetConfirm, setShowProductResetConfirm] = useState(false); // Nuevo estado

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const salesSnapshot = await getDocs(collection(db, 'sales'));
            const lotsSnapshot = await getDocs(collection(db, 'productLots'));
            
            const salesList = salesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            const lotList = lotsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

            setAllSales(salesList);
            setAllLots(lotList);
        } catch (error) {
            console.error("Error al cargar los datos para los reportes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const processData = useCallback((sales, lots) => {
        const inventoryValue = lots.reduce((sum, p) => sum + ((p.acquisitionCost || 0) * (p.stock || 0)), 0);
        
        let totalProfit = 0;
        const productsProfitForChart = {};
        const salesByCategory = {};
        const investmentRecovery = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const lotId = item.id;
                if (!lotId) return;

                let unitsSoldThisItem = 0;
                if (item.sellType === 'unit') unitsSoldThisItem = item.quantity;
                else if (item.sellType === 'blister') unitsSoldThisItem = item.quantity * (item.unitsPerBlister || 0);
                else if (item.sellType === 'box') unitsSoldThisItem = item.quantity * (item.unitsPerBox || 0);
                
                const revenueThisItem = item.price * item.quantity;
                const costThisItem = (item.acquisitionCost || 0) * unitsSoldThisItem;
                const profitForItem = revenueThisItem - costThisItem;
                
                totalProfit += profitForItem;

                const chartProduct = productsProfitForChart[item.name] || { cost: 0, revenue: 0, profit: 0 };
                chartProduct.cost += costThisItem;
                chartProduct.revenue += revenueThisItem;
                chartProduct.profit += profitForItem;
                productsProfitForChart[item.name] = chartProduct;

                const currentLot = investmentRecovery[lotId] || { revenue: 0, unitsSold: 0 };
                currentLot.unitsSold += unitsSoldThisItem;
                currentLot.revenue += revenueThisItem;
                investmentRecovery[lotId] = currentLot;
                
                const category = item.category || 'Sin categoría';
                salesByCategory[category] = (salesByCategory[category] || 0) + revenueThisItem;
            });
        });

        const allProductsFormattedForTable = lots.map(lot => {
            const soldData = investmentRecovery[lot.id] || { unitsSold: 0, revenue: 0 };
            const originalStock = (lot.stock || 0) + soldData.unitsSold;
            const initialInvestment = (lot.acquisitionCost || 0) * originalStock;

            if (initialInvestment === 0 && soldData.revenue === 0) return null;

            const netProfit = soldData.revenue - initialInvestment;
            const recoveryPercentage = initialInvestment > 0 ? Math.min((soldData.revenue / initialInvestment) * 100, 100) : 0;
            
            return {
                name: lot.name,
                lotNumber: lot.lotNumber,
                initialInvestment,
                revenue: soldData.revenue,
                netProfit,
                recoveryPercentage
            };
        }).filter(p => p !== null).sort((a,b) => b.netProfit - a.netProfit);
            
        const top5Products = Object.keys(productsProfitForChart).map(name => ({name, ...productsProfitForChart[name]})).sort((a,b) => b.profit - a.profit).slice(0, 5);
        const formattedSalesCategory = Object.keys(salesByCategory).map(name => ({ name, value: salesByCategory[name] }));

        setReportData({
            inventoryValue,
            totalProfit,
            topProductsByProfit: top5Products,
            allProductsProfit: allProductsFormattedForTable,
            salesByCategory: formattedSalesCategory
        });
    }, []);
    
    useEffect(() => {
        if (loading) return;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

        const filteredSales = allSales.filter(sale => {
            const saleDate = sale.date.toDate();
            if (filter === 'today') return saleDate >= today;
            if (filter === 'week') return saleDate >= weekAgo;
            if (filter === 'month') return saleDate >= monthAgo;
            return true;
        });
        processData(filteredSales, allLots);
    }, [filter, allSales, allLots, loading, processData]);

    const handleResetSalesData = async () => {
        setShowSalesResetConfirm(false);
        setLoading(true);
        try {
            const salesSnapshot = await getDocs(collection(db, 'sales'));
            const batch = writeBatch(db);
            salesSnapshot.docs.forEach(saleDoc => {
                batch.delete(doc(db, 'sales', saleDoc.id));
            });
            await batch.commit();
            showNotification('Todos los datos de ventas han sido reseteados.');
            fetchData();
        } catch (error) {
            console.error("Error al resetear los datos de ventas:", error);
            showNotification('Ocurrió un error al resetear los datos.', 'error');
            setLoading(false);
        }
    };
    
    // --- INICIO: Nueva función para resetear productos y lotes ---
    const handleResetProductsData = async () => {
        setShowProductResetConfirm(false);
        setLoading(true);
        try {
            const batch = writeBatch(db);
            // Obtener y borrar todos los lotes
            const lotsSnapshot = await getDocs(collection(db, 'productLots'));
            lotsSnapshot.docs.forEach(lotDoc => {
                batch.delete(doc(db, 'productLots', lotDoc.id));
            });
            // Obtener y borrar todos los productos maestros
            const productsSnapshot = await getDocs(collection(db, 'products'));
            productsSnapshot.docs.forEach(prodDoc => {
                batch.delete(doc(db, 'products', prodDoc.id));
            });
            await batch.commit();
            showNotification('Todo el inventario ha sido reseteado.');
            fetchData();
        } catch (error) {
            console.error("Error al resetear el inventario:", error);
            showNotification('Ocurrió un error al resetear el inventario.', 'error');
            setLoading(false);
        }
    }
    // --- FIN: Nueva función ---

    const FilterButton = ({ period, text }) => (
        <button
            onClick={() => setFilter(period)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === period ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        >
            {text}
        </button>
    );
    
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    if (loading) {
        return <div className="p-10 text-center">Generando reportes...</div>;
    }
    
    return (
        <div className="p-6 bg-gray-50 min-h-full space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-2 p-1 bg-gray-200 rounded-lg">
                        <FilterButton period="today" text="Hoy" />
                        <FilterButton period="week" text="Semana" />
                        <FilterButton period="month" text="Mes" />
                        <FilterButton period="all" text="Siempre" />
                    </div>
                    <button onClick={() => setShowProductResetConfirm(true)} className="flex items-center px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">
                        <Trash2 size={16} className="mr-2"/>
                        Resetear Inventario
                    </button>
                    <button onClick={() => setShowSalesResetConfirm(true)} className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                        <Trash2 size={16} className="mr-2"/>
                        Resetear Ventas
                    </button>
                </div>
            </div>
            
            {(!reportData || allLots.length === 0) ? (
                <div className="p-10 text-center text-gray-500">No hay datos de inventario para generar reportes.</div>
            ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard 
                        title="Ganancia Total Estimada (Ventas)" 
                        value={`S/ ${reportData.totalProfit.toFixed(2)}`} 
                        icon={<TrendingUp size={24} className="text-white"/>} 
                        color="bg-emerald-500" />
                    <StatCard 
                        title="Valor de Compra del Inventario" 
                        value={`S/ ${reportData.inventoryValue.toFixed(2)}`} 
                        icon={<DollarSign size={24} className="text-white"/>} 
                        color="bg-purple-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Top 5 Productos por Ganancia</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.topProductsByProfit} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" interval={0} width={150} tick={{ fontSize: 12 }}/>
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(230, 230, 230, 0.5)'}} />
                                <Legend />
                                <Bar dataKey="profit" name="Ganancia Neta" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Ventas por Categoría (Ingresos)</h2>
                        {reportData.salesByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={reportData.salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                        {reportData.salesByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">No hay datos de ventas en este período.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Reporte de Recuperación de Inversión por Lote</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto (Lote)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inversión Inicial</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos Generados</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recuperación (%)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia / Pérdida Neta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reportData.allProductsProfit.map((product, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {product.name}
                                            <span className="ml-2 text-xs text-gray-500 font-mono">{product.lotNumber}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-red-600">S/ {product.initialInvestment.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-blue-600">S/ {product.revenue.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-semibold">{product.recoveryPercentage.toFixed(1)}%</td>
                                        <td className={`px-6 py-4 text-right font-bold ${product.netProfit >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                            S/ {product.netProfit.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
            )}

            {showSalesResetConfirm && (
                <Modal onClose={() => setShowSalesResetConfirm(false)}>
                    <div className="text-center">
                        <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                        <h2 className="text-2xl font-bold my-4">Resetear Datos de Ventas</h2>
                        <p className="text-gray-600 mb-6">¿Estás seguro? Esta acción eliminará permanentemente TODOS los registros de ventas y no se puede deshacer.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setShowSalesResetConfirm(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                            <button onClick={handleResetSalesData} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">Sí, Resetear Ventas</button>
                        </div>
                    </div>
                </Modal>
            )}

            {showProductResetConfirm && (
                <Modal onClose={() => setShowProductResetConfirm(false)}>
                    <div className="text-center">
                        <AlertTriangle className="mx-auto h-16 w-16 text-orange-500" />
                        <h2 className="text-2xl font-bold my-4">Resetear Datos de Inventario</h2>
                        <p className="text-gray-600 mb-6">¿Estás seguro? Esta acción eliminará permanentemente TODOS los productos maestros y sus lotes. No se puede deshacer.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setShowProductResetConfirm(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                            <button onClick={handleResetProductsData} className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Sí, Resetear Inventario</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Reports;