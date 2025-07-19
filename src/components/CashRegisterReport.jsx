// src/components/CashRegisterReport.jsx

import React from 'react';
import { X, User, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const CashRegisterReport = ({ 
  cashDrawer, 
  onClose, 
  onConfirmClose 
}) => {
  // Calcular datos del reporte
  const validTransactions = cashDrawer.transactions?.filter(t => t.status !== 'voided') || [];
  
  const cashSales = validTransactions
    .filter(t => t.paymentMethod === 'Efectivo')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const yapeSales = validTransactions
    .filter(t => t.paymentMethod === 'Yape')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalSales = cashSales + yapeSales;
  const transactionCount = validTransactions.length;
  
  const voidedTransactions = cashDrawer.transactions?.filter(t => t.status === 'voided') || [];
  const voidedAmount = voidedTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const expectedCash = cashDrawer.openingBalance + cashSales;
  const countedCash = parseFloat(cashDrawer.closingBalance || 0);
  const difference = countedCash - expectedCash;
  
  const report = {
    cashSales,
    yapeSales,
    totalSales,
    transactionCount,
    voidedTransactions: voidedTransactions.length,
    voidedAmount,
    expectedCash,
    countedCash,
    difference,
    openingBalance: cashDrawer.openingBalance,
    generatedAt: new Date()
  };

  const formatCurrency = (amount) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifferenceStatus = () => {
    if (difference === 0) return { text: 'Exacto', color: 'text-green-600', bg: 'bg-green-100' };
    if (difference > 0) return { text: 'Exceso', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { text: 'Faltante', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const differenceStatus = getDifferenceStatus();

  const handleConfirmClose = () => {
    // Llamar la función de confirmación pasando el reporte
    onConfirmClose(report);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Reporte de Cierre de Caja</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información general */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Información General</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <User className="mr-2 text-gray-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Usuario</p>
                  <p className="font-medium">{cashDrawer.userName}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 text-gray-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Fecha Apertura</p>
                  <p className="font-medium">{formatDateTime(cashDrawer.openedAt?.toDate())}</p>
                </div>
              </div>
              <div className="flex items-center">
                <DollarSign className="mr-2 text-gray-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Saldo Inicial</p>
                  <p className="font-medium">{formatCurrency(cashDrawer.openingBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de ventas */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <TrendingUp className="mr-2" size={20} />
              Resumen de Ventas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{transactionCount}</p>
                <p className="text-sm text-gray-600">Transacciones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(cashSales)}</p>
                <p className="text-sm text-gray-600">Ventas Efectivo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(yapeSales)}</p>
                <p className="text-sm text-gray-600">Ventas Yape</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSales)}</p>
                <p className="text-sm text-gray-600">Total Ventas</p>
              </div>
            </div>
          </div>

          {/* Ventas anuladas */}
          {voidedTransactions.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <AlertTriangle className="mr-2 text-yellow-600" size={20} />
                Ventas Anuladas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-600">{voidedTransactions.length}</p>
                  <p className="text-sm text-gray-600">Transacciones Anuladas</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-600">{formatCurrency(voidedAmount)}</p>
                  <p className="text-sm text-gray-600">Monto Anulado</p>
                </div>
              </div>
            </div>
          )}

          {/* Reconciliación de caja */}
          <div className="bg-white border-2 border-gray-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Reconciliación de Caja</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span>Saldo inicial:</span>
                <span className="font-medium">{formatCurrency(cashDrawer.openingBalance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span>+ Ventas en efectivo:</span>
                <span className="font-medium">{formatCurrency(cashSales)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 font-semibold">
                <span>= Efectivo esperado:</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span>Efectivo contado:</span>
                <span className="font-medium">{formatCurrency(countedCash)}</span>
              </div>
              <div className={`flex justify-between py-2 font-bold text-lg ${differenceStatus.color}`}>
                <span>Diferencia ({differenceStatus.text}):</span>
                <span className={`px-2 py-1 rounded ${differenceStatus.bg}`}>
                  {formatCurrency(Math.abs(difference))}
                </span>
              </div>
            </div>
          </div>

          {/* Detalle de transacciones */}
          {validTransactions.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Detalle de Transacciones</h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">ID</th>
                      <th className="text-left py-2">Método</th>
                      <th className="text-right py-2">Monto</th>
                      <th className="text-left py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validTransactions.map((transaction, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1">{transaction.id || `T${index + 1}`}</td>
                        <td className="py-1">{transaction.paymentMethod}</td>
                        <td className="py-1 text-right">{formatCurrency(transaction.amount)}</td>
                        <td className="py-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status === 'completed' ? 'Completada' : transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota sobre diferencias */}
          {Math.abs(difference) > 0 && (
            <div className={`p-4 rounded-lg border-l-4 ${
              difference > 0 ? 'bg-blue-50 border-blue-400' : 'bg-red-50 border-red-400'
            }`}>
              <div className="flex">
                <AlertTriangle className={`mr-2 ${difference > 0 ? 'text-blue-500' : 'text-red-500'}`} size={20} />
                <div>
                  <p className="font-medium">
                    {difference > 0 ? 'Exceso detectado' : 'Faltante detectado'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {difference > 0 
                      ? 'Hay más dinero en caja del esperado. Verifica si hay ventas no registradas o errores en el conteo.'
                      : 'Falta dinero en la caja. Verifica el conteo y las transacciones realizadas.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            Reporte generado el {formatDateTime(new Date())}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmClose}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirmar Cierre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashRegisterReport;
