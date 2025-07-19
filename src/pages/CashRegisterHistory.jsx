// src/pages/CashRegisterHistory.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { User, Filter, Eye, Clock } from 'lucide-react';

const CashRegisterHistory = ({ user }) => {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [filteredRegisters, setFilteredRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    user: '',
    status: 'all' // all, open, closed
  });

  const fetchCashRegisters = useCallback(async () => {
    try {
      let q;
      if (user.role === 'admin') {
        // Admins pueden ver todas las cajas
        q = query(collection(db, 'cash_drawers'), orderBy('openedAt', 'desc'));
      } else {
        // Vendedores solo ven sus propias cajas
        q = query(
          collection(db, 'cash_drawers'), 
          where('userId', '==', user.uid),
          orderBy('openedAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const registers = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        openedAt: doc.data().openedAt?.toDate(),
        closedAt: doc.data().closedAt?.toDate()
      }));
      setCashRegisters(registers);
    } catch (error) {
      console.error('Error fetching cash registers:', error);
    } finally {
      setLoading(false);
    }
  }, [user.uid, user.role]);

  const applyFilters = useCallback(() => {
    let filtered = [...cashRegisters];

    if (filters.startDate) {
      filtered = filtered.filter(register => 
        register.openedAt >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(register => 
        register.openedAt <= new Date(filters.endDate + 'T23:59:59')
      );
    }

    if (filters.user) {
      filtered = filtered.filter(register => 
        register.userName.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      if (filters.status === 'open') {
        filtered = filtered.filter(register => register.status === 'open');
      } else if (filters.status === 'closed') {
        filtered = filtered.filter(register => register.status === 'closed');
      }
    }

    setFilteredRegisters(filtered);
  }, [cashRegisters, filters]);

  useEffect(() => {
    fetchCashRegisters();
  }, [fetchCashRegisters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      user: '',
      status: 'all'
    });
  };

  const calculateDifference = (register) => {
    if (!register.closedAt || !register.report) return 'N/A';
    
    const expectedCash = register.openingBalance + (register.report.cashSales || 0);
    const actualCash = register.closingBalance || 0;
    const difference = actualCash - expectedCash;
    
    return difference;
  };

  const formatCurrency = (amount) => {
    return `S/ ${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifferenceColor = (difference) => {
    if (difference === 'N/A') return 'text-gray-500';
    const diff = parseFloat(difference);
    if (diff === 0) return 'text-green-600';
    if (diff > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status) => {
    if (status === 'open') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Abierta</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">Cerrada</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 p-6">
        <div className="text-lg text-gray-600">Cargando historial de cajas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Historial de Cajas</h1>
        <p className="text-gray-600">Consulta el historial de aperturas y cierres de caja</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="mr-2" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {user.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
                placeholder="Buscar por usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="open">Abiertas</option>
              <option value="closed">Cerradas</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Tabla de historial */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha Apertura</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha Cierre</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Saldo Inicial</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Saldo Final</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Diferencia</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRegisters.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron registros de caja
                  </td>
                </tr>
              ) : (
                filteredRegisters.map(register => {
                  const difference = calculateDifference(register);
                  return (
                    <tr key={register.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <User className="mr-2 text-gray-400" size={16} />
                          {register.userName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <Clock className="mr-2 text-gray-400" size={16} />
                          {formatDateTime(register.openedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {register.closedAt ? formatDateTime(register.closedAt) : 
                          <span className="text-orange-600 font-medium">En progreso</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(register.openingBalance)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {register.closingBalance ? formatCurrency(register.closingBalance) : 'N/A'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${getDifferenceColor(difference)}`}>
                        {difference !== 'N/A' ? formatCurrency(Math.abs(difference)) : 'N/A'}
                        {difference !== 'N/A' && difference !== 0 && (
                          <span className="ml-1 text-xs">
                            {difference > 0 ? '↑' : '↓'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(register.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {register.report && (
                          <button
                            onClick={() => setSelectedReport(register)}
                            className="inline-flex items-center px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Ver reporte detallado"
                          >
                            <Eye size={14} className="mr-1" />
                            Ver Reporte
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de reporte detallado */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Reporte Detallado de Caja</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Usuario:</p>
                    <p className="font-semibold">{selectedReport.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha:</p>
                    <p className="font-semibold">{formatDateTime(selectedReport.openedAt)}</p>
                  </div>
                </div>
                
                {selectedReport.report && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Resumen de Ventas</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Ventas en Efectivo:</span>
                        <span className="font-medium">{formatCurrency(selectedReport.report.cashSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ventas con Yape:</span>
                        <span className="font-medium">{formatCurrency(selectedReport.report.yapeSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Ventas:</span>
                        <span className="font-medium">{formatCurrency(selectedReport.report.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Número de Transacciones:</span>
                        <span className="font-medium">{selectedReport.report.transactionCount}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between">
                        <span>Saldo Esperado:</span>
                        <span className="font-medium">{formatCurrency(selectedReport.openingBalance + selectedReport.report.cashSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saldo Contado:</span>
                        <span className="font-medium">{formatCurrency(selectedReport.closingBalance)}</span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t ${getDifferenceColor(calculateDifference(selectedReport))}`}>
                        <span>Diferencia:</span>
                        <span className="font-bold">
                          {formatCurrency(Math.abs(calculateDifference(selectedReport)))}
                          {calculateDifference(selectedReport) > 0 ? ' (Exceso)' : calculateDifference(selectedReport) < 0 ? ' (Faltante)' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegisterHistory;
