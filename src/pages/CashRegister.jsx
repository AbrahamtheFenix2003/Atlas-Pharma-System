import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import CashRegisterReport from '../components/CashRegisterReport';

const CashRegister = ({ user }) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [cashDrawer, setCashDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [recentHistory, setRecentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchCashDrawer = async () => {
      try {
        // Buscar cualquier caja abierta (no filtrar por usuario)
        const q = query(
          collection(db, 'cash_drawers'),
          where('status', '==', 'open')
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Si hay múltiples cajas abiertas, tomar la más reciente
          const drawers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          // Ordenar por fecha de apertura (más reciente primero)
          drawers.sort((a, b) => (b.openedAt?.toMillis() || 0) - (a.openedAt?.toMillis() || 0));
          setCashDrawer(drawers[0]);
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

  // Función para obtener historial reciente de cajas
  const fetchRecentHistory = async () => {
    try {
      let q;
      if (user.role === 'admin') {
        // Administradores ven todas las cajas (abiertas y cerradas) recientes
        q = query(
          collection(db, 'cash_drawers'),
          orderBy('openedAt', 'desc'),
          limit(5)
        );
      } else {
        // Vendedores ven todas sus cajas (sin orderBy para evitar índice compuesto)
        q = query(
          collection(db, 'cash_drawers'),
          where('userId', '==', user.uid)
        );
      }
      
      const querySnapshot = await getDocs(q);
      let history = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        openedAt: doc.data().openedAt?.toDate(),
        closedAt: doc.data().closedAt?.toDate()
      }));

      // Para vendedores, ordenar manualmente y tomar los últimos 5
      if (user.role !== 'admin') {
        history = history
          .sort((a, b) => (b.openedAt?.getTime() || 0) - (a.openedAt?.getTime() || 0))
          .slice(0, 5);
      }
      
      setRecentHistory(history);
    } catch (err) {
      console.error('Error al obtener historial:', err);
    }
  };

  // Cargar historial cuando se monta el componente
  useEffect(() => {
    fetchRecentHistory();
  }, [user.uid, user.role]); // eslint-disable-line react-hooks/exhaustive-deps

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
        userRole: user.role,
        openingBalance: parseFloat(openingBalance),
        status: 'open',
        openedAt: serverTimestamp(),
        transactions: [],
      };
      const docRef = await addDoc(collection(db, 'cash_drawers'), newDrawer);
      setCashDrawer({ id: docRef.id, ...newDrawer });
      setOpeningBalance('');
      setError('');
      // Recargar historial después de abrir
      fetchRecentHistory();
    } catch (err) {
      setError('Error al abrir la caja.');
      console.error(err);
    }
  };

  const handlePreCloseDrawer = async (e) => {
    e.preventDefault();
    
    // Verificar que el usuario tenga permisos para cerrar caja (solo admin)
    if (user.role !== 'admin') {
      setError('Solo los administradores pueden cerrar la caja.');
      return;
    }

    if (!closingBalance || isNaN(closingBalance)) {
      setError('Por favor, introduce un saldo final válido.');
      return;
    }

    // Actualizar el cashDrawer con el saldo de cierre para el reporte
    const updatedDrawer = {
      ...cashDrawer,
      closingBalance: parseFloat(closingBalance)
    };
    setCashDrawer(updatedDrawer);
    setShowReport(true);
  };

  const handleConfirmClose = async (report) => {
    try {
      const drawerRef = doc(db, 'cash_drawers', cashDrawer.id);
      await updateDoc(drawerRef, {
        closingBalance: parseFloat(closingBalance),
        status: 'closed',
        closedAt: serverTimestamp(),
        report: report // Guardar el reporte completo
      });
      setCashDrawer(null);
      setClosingBalance('');
      setShowReport(false);
      setError('');
      // Recargar historial después de cerrar
      fetchRecentHistory();
    } catch (err) {
      setError('Error al cerrar la caja.');
      console.error(err);
    }
  };

  const calculateBalances = () => {
    if (!cashDrawer) return { cash: 0, yape: 0, total: 0 };

    const validTransactions = cashDrawer.transactions.filter(t => t.status !== 'voided');

    const cashSales = validTransactions
      .filter(t => t.paymentMethod === 'Efectivo')
      .reduce((sum, t) => sum + t.amount, 0);

    const yapeSales = validTransactions
      .filter(t => t.paymentMethod === 'Yape')
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedCash = cashDrawer.openingBalance + cashSales;

    return { cash: expectedCash, yape: yapeSales, total: expectedCash + yapeSales };
  };

  const balances = calculateBalances();

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Gestión de Caja</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {cashDrawer ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Estado de la Caja</h2>
            <div className="text-sm text-gray-600">
              Usuario actual: <span className="font-semibold">{user.name}</span> 
              <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span>Caja abierta por:</span>
              <span className="font-bold">{cashDrawer.userName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Fecha de apertura:</span>
              <span className="font-medium">
                {cashDrawer.openedAt?.toDate ? 
                  cashDrawer.openedAt.toDate().toLocaleString() : 
                  'Fecha no disponible'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Saldo inicial:</span>
              <span className="font-bold text-green-600">S/ {cashDrawer.openingBalance.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-lg mb-2">Resumen de Ventas</h3>
            <div className="flex justify-between mb-1">
              <span>Ventas con Yape:</span>
              <span className="font-bold">S/ {balances.yape.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Efectivo esperado en caja:</span>
              <span className="font-bold">S/ {balances.cash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
              <span>Total General Esperado:</span>
              <span>S/ {balances.total.toFixed(2)}</span>
            </div>
          </div>

          {user.role === 'admin' ? (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600">Cerrar Caja</h3>
              <form onSubmit={handlePreCloseDrawer}>
                <div className="mb-4">
                  <label htmlFor="closingBalance" className="block text-lg font-medium text-gray-700">
                    Saldo de Cierre (conteo de efectivo)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="closingBalance"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Introduce el saldo final contado en efectivo"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Generar Reporte de Cierre
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Caja compartida
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Puedes realizar ventas usando esta caja. Solo los administradores pueden cerrarla.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">No hay caja abierta</h2>
            <div className="text-sm text-gray-600">
              Usuario: <span className="font-semibold">{user.name}</span> 
              <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Abrir nueva caja
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    {user.role === 'admin' 
                      ? 'Puedes abrir una nueva caja. Una vez abierta, será accesible para todos los usuarios.'
                      : 'Puedes abrir una caja para comenzar las ventas. Solo los administradores pueden cerrarla.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Abrir Nueva Caja</h3>
          <form onSubmit={handleOpenDrawer}>
            <div className="mb-4">
              <label htmlFor="openingBalance" className="block text-lg font-medium text-gray-700">
                Saldo Inicial
              </label>
              <input
                type="number"
                step="0.01"
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

      {/* Sección de Historial Reciente */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Historial Reciente</h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showHistory ? 'Ocultar' : 'Mostrar'} Historial
          </button>
        </div>

        {showHistory && (
          <div className="bg-gray-50 rounded-lg p-4">
            {recentHistory.length > 0 ? (
              <div className="space-y-3">
                {recentHistory.map((drawer) => (
                  <div key={drawer.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800">{drawer.userName}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          drawer.userRole === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {drawer.userRole === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        drawer.status === 'open' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {drawer.status === 'open' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Apertura:</span>
                        <div>{drawer.openedAt?.toLocaleDateString()}</div>
                        <div>{drawer.openedAt?.toLocaleTimeString()}</div>
                      </div>
                      {drawer.closedAt && (
                        <div>
                          <span className="font-medium">Cierre:</span>
                          <div>{drawer.closedAt?.toLocaleDateString()}</div>
                          <div>{drawer.closedAt?.toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm">
                        <span className="font-medium">Saldo inicial:</span>
                        <span className="ml-1 text-green-600">S/ {drawer.openingBalance.toFixed(2)}</span>
                      </div>
                      {drawer.closingBalance && (
                        <div className="text-sm">
                          <span className="font-medium">Saldo final:</span>
                          <span className="ml-1 text-red-600">S/ {drawer.closingBalance.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No hay historial disponible</p>
                <p className="text-sm">
                  {user.role === 'admin' 
                    ? 'No hay cajas registradas en el sistema'
                    : 'No has abierto ninguna caja aún'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de reporte detallado */}
      {showReport && cashDrawer && (
        <CashRegisterReport
          cashDrawer={cashDrawer}
          onClose={() => setShowReport(false)}
          onConfirmClose={handleConfirmClose}
        />
      )}
    </div>
  );
};

export default CashRegister;