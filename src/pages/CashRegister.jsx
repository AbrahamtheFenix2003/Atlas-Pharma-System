import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const CashRegister = ({ user }) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [cashDrawer, setCashDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCashDrawer = async () => {
      try {
        const q = query(
          collection(db, 'cash_drawers'),
          where('status', '==', 'open'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const drawer = querySnapshot.docs[0];
          setCashDrawer({ id: drawer.id, ...drawer.data() });
        } else {
          setCashDrawer(null);
        }
      } catch (err) {
        setError('Error al obtener el estado de la caja.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCashDrawer();
  }, [user.uid]);

  const handleOpenDrawer = async (e) => {
    e.preventDefault();
    if (!openingBalance || isNaN(openingBalance)) {
      setError('Por favor, introduce un saldo inicial válido.');
      return;
    }

    try {
      const newDrawer = {
        userId: user.uid,
        userName: user.name,
        openingBalance: parseFloat(openingBalance),
        status: 'open',
        openedAt: serverTimestamp(),
        transactions: [],
      };
      const docRef = await addDoc(collection(db, 'cash_drawers'), newDrawer);
      setCashDrawer({ id: docRef.id, ...newDrawer });
      setOpeningBalance('');
      setError('');
    } catch (err) {
      setError('Error al abrir la caja.');
      console.error(err);
    }
  };

  const handleCloseDrawer = async (e) => {
    e.preventDefault();
    if (!closingBalance || isNaN(closingBalance)) {
      setError('Por favor, introduce un saldo final válido.');
      return;
    }

    try {
      const drawerRef = doc(db, 'cash_drawers', cashDrawer.id);
      await updateDoc(drawerRef, {
        closingBalance: parseFloat(closingBalance),
        status: 'closed',
        closedAt: serverTimestamp(),
      });
      setCashDrawer(null);
      setClosingBalance('');
      setError('');
    } catch (err) {
      setError('Error al cerrar la caja.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Gestión de Caja</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {cashDrawer ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Cerrar Caja</h2>
          <p className="mb-2">Caja abierta por: <strong>{cashDrawer.userName}</strong></p>
          <p className="mb-4">Saldo inicial: <strong>${cashDrawer.openingBalance.toFixed(2)}</strong></p>
          <form onSubmit={handleCloseDrawer}>
            <div className="mb-4">
              <label htmlFor="closingBalance" className="block text-lg font-medium text-gray-700">Saldo de Cierre</label>
              <input
                type="number"
                id="closingBalance"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Introduce el saldo final"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar Caja
            </button>
          </form>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Abrir Caja</h2>
          <form onSubmit={handleOpenDrawer}>
            <div className="mb-4">
              <label htmlFor="openingBalance" className="block text-lg font-medium text-gray-700">Saldo Inicial</label>
              <input
                type="number"
                id="openingBalance"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Introduce el saldo inicial"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Abrir Caja
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CashRegister;