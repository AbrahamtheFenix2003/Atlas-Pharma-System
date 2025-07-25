// src/pages/SalesHistory.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, increment } from 'firebase/firestore';
import Modal from '../components/common/Modal.jsx';
import { XCircle, AlertTriangle } from 'lucide-react';

const SalesHistory = ({ showNotification }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showVoidConfirm, setShowVoidConfirm] = useState(false);
    const [saleToVoid, setSaleToVoid] = useState(null);
    const [isVoiding, setIsVoiding] = useState(false);

    useEffect(() => {
        const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(salesQuery, snapshot => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenVoidModal = (sale) => { setSaleToVoid(sale); setShowVoidConfirm(true); };

    const handleVoidSale = async () => {
        if (!saleToVoid) return;
        setIsVoiding(true);
        try {
            await runTransaction(db, async (transaction) => {
                // --- FASE DE LECTURA ---
                const saleRef = doc(db, 'sales', saleToVoid.id);
                let drawerRef, drawerDoc;

                if (saleToVoid.cashDrawerId) {
                    drawerRef = doc(db, 'cash_drawers', saleToVoid.cashDrawerId);
                    drawerDoc = await transaction.get(drawerRef);
                }

                const lotRefs = saleToVoid.items.map(item => doc(db, 'productLots', item.id));
                const lotDocs = await Promise.all(lotRefs.map(ref => transaction.get(ref)));

                // --- FASE DE ESCRITURA ---
                transaction.update(saleRef, { status: 'voided' });

                if (saleToVoid.cashDrawerId && drawerDoc.exists()) {
                    const drawerData = drawerDoc.data();
                    const transactions = drawerData.transactions || [];
                    const updatedTransactions = transactions.map(t =>
                        t.saleId === saleToVoid.id ? { ...t, status: 'voided' } : t
                    );
                    transaction.update(drawerRef, { transactions: updatedTransactions });
                }

                saleToVoid.items.forEach((item, index) => {
                    const lotDoc = lotDocs[index];
                    if (lotDoc.exists()) {
                        let unitsToReturn = 0;
                        if (item.sellType === 'unit') unitsToReturn = item.quantity;
                        else if (item.sellType === 'blister') unitsToReturn = item.quantity * item.unitsPerBlister;
                        else if (item.sellType === 'box') unitsToReturn = item.quantity * item.unitsPerBox;

                        if (unitsToReturn > 0) {
                            transaction.update(lotRefs[index], { stock: increment(unitsToReturn) });
                        }
                    }
                });
            });

            showNotification('Venta anulada correctamente');
            setShowVoidConfirm(false);
            setSaleToVoid(null);
        } catch (e) {
            console.error("Error detallado al anular la venta: ", e);
            showNotification('Ocurrió un error al anular la venta. Revisa la consola para más detalles.', 'error');
        } finally {
            setIsVoiding(false);
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Historial de Ventas</h1>
            {loading ? <p>Cargando...</p> : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sales.map(sale => {
                                    const isVoided = sale.status === 'voided';
                                    return (
                                        <tr key={sale.id} className={`${isVoided ? 'bg-red-50 text-gray-400 line-through' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 text-sm font-medium">{sale.sellerName || 'No registrado'}</td>
                                            <td className="px-6 py-4 text-sm">{sale.date.toDate().toLocaleString('es-ES')}</td>
                                            <td className={`px-6 py-4 text-right text-sm font-bold ${isVoided ? '' : 'text-green-600'}`}>S/ {sale.total.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center text-sm">
                                                {isVoided ? <span className='font-bold text-red-500'>Anulada</span> : <span className='font-bold text-green-500'>Completada</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-4">
                                                <button onClick={() => setSelectedSale(sale)} disabled={isVoided} className="text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">Ver</button>
                                                <button onClick={() => handleOpenVoidModal(sale)} disabled={isVoided} className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed" title="Anular Venta"><XCircle size={18}/></button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {selectedSale && <Modal onClose={() => setSelectedSale(null)}><h2 className="text-2xl font-bold mb-4">Detalles de Venta</h2>
                <div className="flex justify-between mb-4">
                    <div>
                        <p>Fecha: {selectedSale.date.toDate().toLocaleString('es-ES')}</p>
                        <p>Vendedor: <span className="font-semibold">{selectedSale.sellerName || 'No registrado'}</span></p>
                    </div>
                    <div className='text-right'>
                        <p>Método de Pago:</p> 
                        <p className='font-bold'>{selectedSale.paymentMethod || 'No especificado'}</p>
                    </div>
                </div>
                <div className="border-t pt-4">{selectedSale.items.map((item, index) => (<div key={index} className="flex justify-between items-center py-2 border-b"><div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">Lab: {item.laboratory} / Lote: <span className="font-mono">{item.lotNumber}</span></p>
                        <p className="text-sm text-gray-500">{item.quantity} x {item.sellType} @ S/ {item.price.toFixed(2)}</p>
                    </div><p className="font-semibold">S/ {(item.quantity * item.price).toFixed(2)}</p></div>))}</div><div className="flex justify-end font-bold text-xl mt-4"><span>TOTAL: S/ {selectedSale.total.toFixed(2)}</span></div></Modal>}
            {showVoidConfirm && <Modal onClose={() => setShowVoidConfirm(false)}><div className="text-center"><AlertTriangle className="mx-auto h-16 w-16 text-red-500" /><h2 className="text-2xl font-bold my-4">Anular Venta</h2><p className="text-gray-600 mb-6">¿Estás seguro? Esta acción no se puede deshacer y los productos serán devueltos al stock.</p><div className="flex justify-center space-x-4"><button onClick={() => setShowVoidConfirm(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button><button onClick={handleVoidSale} disabled={isVoiding} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">Sí, anular</button></div></div></Modal>}
        </div>
    );
};
export default SalesHistory;