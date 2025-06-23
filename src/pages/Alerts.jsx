import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const Alerts = () => {
    const [lowStock, setLowStock] = useState([]);
    const [expiring, setExpiring] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const lotsQuery = query(collection(db, "productLots"), where("isActive", "==", true));
        const unsubscribe = onSnapshot(lotsQuery, (snapshot) => {
            const low = [];
            const exp = [];
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            snapshot.forEach(doc => {
                const lot = { id: doc.id, ...doc.data() };
                if (lot.stock > 0 && lot.stock <= lot.lowStockThreshold) low.push(lot);
                if (lot.expiryDate && lot.expiryDate.toDate() < thirtyDaysFromNow) exp.push(lot);
            });
            setLowStock(low);
            setExpiring(exp.sort((a,b) => a.expiryDate.toDate() - b.expiryDate.toDate()));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Alertas</h1>
            {loading ? <p>Cargando alertas...</p> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-yellow-600 mb-4">Lotes con Bajo Stock</h2>
                    {lowStock.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                           {lowStock.map(l => (
                               <li key={l.id} className="py-3 flex justify-between items-center">
                                   <div>
                                       <span className="font-medium">{l.name}</span>
                                       <p className="text-xs text-gray-500">Lab: {l.laboratory} / Lote: {l.lotNumber}</p>
                                   </div>
                                   <span className="font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full text-sm">Stock: {l.stock}</span>
                               </li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">No hay lotes con bajo stock.</p>}
                </div>
                 <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Lotes Próximos a Vencer</h2>
                     {expiring.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                           {expiring.map(l => (
                               <li key={l.id} className="py-3 flex justify-between items-center">
                                   <div>
                                       <span className="font-medium">{l.name}</span>
                                       <p className="text-xs text-gray-500">Lab: {l.laboratory} / Lote: {l.lotNumber}</p>
                                   </div>
                                   <span className="font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm">Vence: {l.expiryDate.toDate().toLocaleDateString('es-ES')}</span>
                               </li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">No hay lotes próximos a vencer.</p>}
                </div>
            </div>
            )}
        </div>
    );
};
export default Alerts;