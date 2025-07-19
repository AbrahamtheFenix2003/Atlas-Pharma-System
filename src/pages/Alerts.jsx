import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, writeBatch } from 'firebase/firestore';

const Alerts = ({ showNotification }) => {
    const [lowStock, setLowStock] = useState([]);
    const [expiring, setExpiring] = useState([]);
    const [expired, setExpired] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingExpired, setProcessingExpired] = useState(false);

    // Función para inhabilitar lotes vencidos automáticamente
    const handleDisableExpiredLots = async () => {
        if (expired.length === 0) {
            showNotification('No hay lotes vencidos para procesar.', 'info');
            return;
        }

        if (!window.confirm(`¿Deseas inhabilitar ${expired.length} lote(s) vencido(s)? Esta acción establecerá su stock en 0 y los marcará como inactivos.`)) {
            return;
        }

        setProcessingExpired(true);
        
        try {
            const batch = writeBatch(db);
            
            expired.forEach(lot => {
                const lotRef = doc(db, 'productLots', lot.id);
                batch.update(lotRef, {
                    isActive: false,
                    stock: 0,
                    disabledReason: 'Producto vencido',
                    disabledDate: new Date()
                });
            });
            
            await batch.commit();
            showNotification(`${expired.length} lote(s) vencido(s) han sido inhabilitados exitosamente.`, 'success');
        } catch (error) {
            console.error('Error al inhabilitar lotes vencidos:', error);
            showNotification('Error al inhabilitar los lotes vencidos.', 'error');
        } finally {
            setProcessingExpired(false);
        }
    };

    useEffect(() => {
        const lotsQuery = query(collection(db, "productLots"), where("isActive", "==", true));
        const unsubscribe = onSnapshot(lotsQuery, (snapshot) => {
            const low = [];
            const exp = [];
            const expiredLots = [];
            const thirtyDaysFromNow = new Date();
            const today = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            snapshot.forEach(doc => {
                const lot = { id: doc.id, ...doc.data() };
                
                // Verificar si el lote está vencido
                if (lot.expiryDate && lot.expiryDate.toDate() < today) {
                    expiredLots.push(lot);
                    return; // No procesar más este lote
                }
                
                // Alertas de stock bajo (solo para productos no vencidos)
                if (lot.stock > 0 && lot.stock <= lot.lowStockThreshold) {
                    low.push(lot);
                }
                
                // Alertas de próximo vencimiento (solo para productos no vencidos)
                if (lot.expiryDate && lot.expiryDate.toDate() < thirtyDaysFromNow && lot.expiryDate.toDate() >= today) {
                    exp.push(lot);
                }
            });
            
            setLowStock(low);
            setExpiring(exp.sort((a,b) => a.expiryDate.toDate() - b.expiryDate.toDate()));
            setExpired(expiredLots.sort((a,b) => b.expiryDate.toDate() - a.expiryDate.toDate())); // Los más recientes primero
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Alertas</h1>
                {expired.length > 0 && (
                    <button
                        onClick={handleDisableExpiredLots}
                        disabled={processingExpired}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center"
                    >
                        {processingExpired ? 'Procesando...' : `Inhabilitar ${expired.length} Vencidos`}
                    </button>
                )}
            </div>
            
            {loading ? <p>Cargando alertas...</p> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Productos Vencidos - NUEVA SECCIÓN */}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                        🚨 Productos Vencidos 
                        {expired.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {expired.length}
                            </span>
                        )}
                    </h2>
                    {expired.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {expired.map(lot => {
                                const daysSinceExpiry = Math.ceil((new Date() - lot.expiryDate.toDate()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={lot.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-medium text-red-900">{lot.name}</span>
                                                <p className="text-xs text-red-600">Lab: {lot.laboratory} / Lote: {lot.lotNumber}</p>
                                                <p className="text-xs text-red-700 font-medium">Stock: {lot.stock} unidades</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-red-800 bg-red-200 px-2 py-1 rounded text-xs">
                                                    Vencido hace {daysSinceExpiry} día{daysSinceExpiry > 1 ? 's' : ''}
                                                </span>
                                                <p className="text-xs text-red-600 mt-1">
                                                    {lot.expiryDate.toDate().toLocaleDateString('es-ES')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-gray-500">No hay productos vencidos. ✅</p>}
                </div>

                {/* Bajo Stock */}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-yellow-600 mb-4 flex items-center">
                        ⚠️ Lotes con Bajo Stock
                        {lowStock.length > 0 && (
                            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {lowStock.length}
                            </span>
                        )}
                    </h2>
                    {lowStock.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                           {lowStock.map(lot => (
                               <div key={lot.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                   <div className="flex justify-between items-center">
                                       <div>
                                           <span className="font-medium text-yellow-900">{lot.name}</span>
                                           <p className="text-xs text-yellow-600">Lab: {lot.laboratory} / Lote: {lot.lotNumber}</p>
                                       </div>
                                       <span className="font-bold text-yellow-800 bg-yellow-200 px-2 py-1 rounded text-sm">Stock: {lot.stock}</span>
                                   </div>
                               </div>
                           ))}
                        </div>
                    ) : <p className="text-gray-500">No hay lotes con bajo stock. ✅</p>}
                </div>

                {/* Próximos a Vencer */}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-orange-600 mb-4 flex items-center">
                        🕒 Próximos a Vencer
                        {expiring.length > 0 && (
                            <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {expiring.length}
                            </span>
                        )}
                    </h2>
                     {expiring.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                           {expiring.map(lot => {
                               const daysUntilExpiry = Math.ceil((lot.expiryDate.toDate() - new Date()) / (1000 * 60 * 60 * 24));
                               return (
                                   <div key={lot.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                       <div className="flex justify-between items-start">
                                           <div>
                                               <span className="font-medium text-orange-900">{lot.name}</span>
                                               <p className="text-xs text-orange-600">Lab: {lot.laboratory} / Lote: {lot.lotNumber}</p>
                                           </div>
                                           <div className="text-right">
                                               <span className="font-bold text-orange-800 bg-orange-200 px-2 py-1 rounded text-xs">
                                                   {daysUntilExpiry} día{daysUntilExpiry > 1 ? 's' : ''}
                                               </span>
                                               <p className="text-xs text-orange-600 mt-1">
                                                   {lot.expiryDate.toDate().toLocaleDateString('es-ES')}
                                               </p>
                                           </div>
                                       </div>
                                   </div>
                               );
                           })}
                        </div>
                    ) : <p className="text-gray-500">No hay lotes próximos a vencer. ✅</p>}
                </div>
            </div>
            )}
        </div>
    );
};
export default Alerts;