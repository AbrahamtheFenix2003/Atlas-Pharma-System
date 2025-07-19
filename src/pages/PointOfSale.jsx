// src/pages/PointOfSale.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config.js';
import { collection, onSnapshot, writeBatch, doc, increment, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { ShoppingCart, DollarSign, Trash2, Landmark } from 'lucide-react';
import Modal from '../components/common/Modal.jsx';

// El componente AddToCartModal no cambia
const AddToCartModal = ({ product, lots, onAddToCart, onClose, showNotification, cart }) => {
    const [selectedLotId, setSelectedLotId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [sellType, setSellType] = useState('unit');

    const availableLots = useMemo(() => {
        const today = new Date();
        return lots
            .filter(l => l.productId === product.id && l.isActive && l.stock > 0)
            .filter(l => !l.expiryDate || l.expiryDate.toDate() >= today) // Filtrar productos vencidos
            .sort((a, b) => (a.expiryDate?.toDate() || 0) - (b.expiryDate?.toDate() || 0));
    }, [lots, product.id]);

    useEffect(() => {
        if (availableLots.length > 0) {
            setSelectedLotId(availableLots[0].id);
        } else {
            setSelectedLotId('');
        }
    }, [availableLots]);

    const selectedLot = lots.find(l => l.id === selectedLotId);

    const handleAdd = () => {
        if (!selectedLot) {
            showNotification('Por favor, selecciona un lote.', 'error');
            return;
        }
        const parsedQuantity = parseInt(quantity)
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            showNotification('Por favor, ingresa una cantidad válida.', 'error');
            return;
        }
        onAddToCart(selectedLot, sellType, parsedQuantity);
        onClose();
    };

    const getMaxQuantity = () => {
        if (!selectedLot) return 0;
        
        const unitsInCart = cart
            .filter(item => item.id === selectedLot.id)
            .reduce((acc, item) => {
                if (item.sellType === 'unit') return acc + item.quantity;
                if (item.sellType === 'blister') return acc + (item.quantity * item.unitsPerBlister);
                if (item.sellType === 'box') return acc + (item.quantity * item.unitsPerBox);
                return acc;
            }, 0);
        
        const remainingStock = selectedLot.stock - unitsInCart;

        if (sellType === 'unit') return remainingStock;
        if (sellType === 'blister' && selectedLot.unitsPerBlister > 0) return Math.floor(remainingStock / selectedLot.unitsPerBlister);
        if (sellType === 'box' && selectedLot.unitsPerBox > 0) return Math.floor(remainingStock / selectedLot.unitsPerBox);
        return 0;
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">{product.name}</h2>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Seleccionar Lote (Ordenado por Vencimiento)</label>
                <select value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)} className="w-full p-2 border rounded mt-1">
                    {availableLots.length > 0 ? (
                        availableLots.map(l => (
                            <option key={l.id} value={l.id}>
                                Lote: {l.lotNumber} (Stock: {l.stock}, Vence: {l.expiryDate ? l.expiryDate.toDate().toLocaleDateString('es-ES') : 'N/A'})
                            </option>
                        ))
                    ) : (
                        <option>No hay lotes con stock disponible</option>
                    )}
                </select>
            </div>

            {selectedLot && (
            <>
            <p className="mb-4 text-sm text-blue-600">Máximo a añadir: {getMaxQuantity()} ({sellType})</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" max={getMaxQuantity()} className="w-full p-2 border rounded mt-1"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Vender por</label>
                    <select value={sellType} onChange={(e) => { setQuantity(1); setSellType(e.target.value); }} className="w-full p-2 border rounded mt-1">
                        <option value="unit">Unidad (S/ {selectedLot.price.toFixed(2)})</option>
                        {selectedLot.sellsByBlister && <option value="blister">Blíster (S/ {selectedLot.pricePerBlister.toFixed(2)})</option>}
                        {selectedLot.sellsByBox && <option value="box">Caja (S/ {selectedLot.pricePerBox.toFixed(2)})</option>}
                    </select>
                </div>
            </div>
            </>
            )}
            
            <div className="flex justify-end space-x-2 pt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                <button type="button" onClick={handleAdd} disabled={!selectedLot} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">Añadir al Carrito</button>
            </div>
        </div>
    );
};


const PointOfSale = ({ showNotification, user, setView }) => {
    const [products, setProducts] = useState([]);
    const [lots, setLots] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cashDrawer, setCashDrawer] = useState(null);

    useEffect(() => {
        const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubLots = onSnapshot(collection(db, "productLots"), (snapshot) => {
            setLots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => { unsubProducts(); unsubLots(); };
    }, []);

    useEffect(() => {
        const fetchCashDrawer = async () => {
            if (!user) return;
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
        };
        fetchCashDrawer();
    }, [user]);

    const addToCart = (lot, sellType, quantity) => {
        if (quantity <= 0) return;
        
        const unitsInCart = cart
            .filter(item => item.id === lot.id)
            .reduce((acc, item) => {
                if (item.sellType === 'unit') return acc + item.quantity;
                if (item.sellType === 'blister') return acc + (item.quantity * item.unitsPerBlister);
                if (item.sellType === 'box') return acc + (item.quantity * item.unitsPerBox);
                return acc;
            }, 0);
        
        let unitsToAdd = 0;
        if (sellType === 'unit') unitsToAdd = quantity;
        else if (sellType === 'blister') unitsToAdd = quantity * lot.unitsPerBlister;
        else if (sellType === 'box') unitsToAdd = quantity * lot.unitsPerBox;

        if (lot.stock < unitsInCart + unitsToAdd) {
            showNotification('Stock insuficiente en este lote para la cantidad solicitada.', 'error');
            return;
        }
        
        const cartItemId = `${lot.id}-${sellType}`;
        
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.cartId === cartItemId);
            if (existingItem) {
                return prevCart.map(item => item.cartId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item);
            }
            let price;
            if (sellType === 'unit') price = lot.price;
            else if (sellType === 'blister') price = lot.pricePerBlister;
            else if (sellType === 'box') price = lot.pricePerBox;
            return [...prevCart, { ...lot, cartId: cartItemId, quantity, sellType, price }];
        });
    };

    const removeFromCart = (cartId) => setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
    
    const handleCompleteSale = async (paymentMethod) => {
        if (cart.length === 0 || !user) return;

        if (!cashDrawer) {
            showNotification('No se puede procesar la venta porque la caja está cerrada.', 'error');
            return;
        }

        setIsProcessing(true);
        const batch = writeBatch(db);
        
        cart.forEach(item => {
            const lotRef = doc(db, 'productLots', item.id);
            let unitsSold = 0;
            if(item.sellType === 'unit') unitsSold = item.quantity;
            else if (item.sellType === 'blister') unitsSold = item.quantity * item.unitsPerBlister;
            else if (item.sellType === 'box') unitsSold = item.quantity * item.unitsPerBox;
            batch.update(lotRef, { stock: increment(-unitsSold) });
        });
        
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const saleData = {
            date: new Date(),
            items: cart,
            total: total,
            sellerId: user.uid,
            sellerName: user.name || user.email,
            paymentMethod: paymentMethod,
            cashDrawerId: cashDrawer.id
        };

        const saleDocRef = doc(collection(db, 'sales'));
        batch.set(saleDocRef, saleData);

        if (cashDrawer) {
            const drawerRef = doc(db, 'cash_drawers', cashDrawer.id);
            batch.update(drawerRef, {
                transactions: arrayUnion({
                    saleId: saleDocRef.id,
                    amount: total,
                    date: new Date(),
                    paymentMethod: paymentMethod
                })
            });
        }
        
        try {
            await batch.commit();
            showNotification(`Venta con ${paymentMethod} completada con éxito`);
            setCart([]);
        } catch (error) {
            console.error("Error al completar la venta: ", error);
            showNotification('Hubo un error al procesar la venta.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.laboratory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row h-full bg-gray-50">
            <div className="w-full lg:w-2/3 p-4 overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Punto de Venta</h2>
                <input type="text" placeholder="Buscar por nombre o laboratorio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 border rounded-lg mb-4 shadow-sm"/>
                {loading ? <p>Cargando...</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const today = new Date();
                            const activeLots = lots.filter(l => l.productId === product.id && l.isActive);
                            const availableLots = activeLots.filter(l => !l.expiryDate || l.expiryDate.toDate() >= today);
                            const totalStock = availableLots.reduce((sum, l) => sum + l.stock, 0);
                            const hasStock = totalStock > 0;
                            const hasExpiredLots = activeLots.length > availableLots.length;

                            return (
                                <div key={product.id} onClick={() => hasStock && setSelectedProduct(product)} className={`bg-white p-4 rounded-lg shadow-md border-2 border-transparent transition-all flex flex-col justify-between ${!hasStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:border-blue-500 cursor-pointer'}`}>
                                    <div>
                                        <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">{product.laboratory}</p>
                                        {hasExpiredLots && (
                                            <p className="text-xs text-red-500 mt-1">⚠️ Tiene lotes vencidos</p>
                                        )}
                                    </div>
                                    <p className={`text-lg font-semibold mt-2 ${hasStock ? 'text-blue-600' : 'text-red-500'}`}>Stock Disponible: {totalStock} Uds.</p>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="w-full lg:w-1/3 bg-white p-6 shadow-lg flex flex-col h-[50vh] lg:h-full">
                {!cashDrawer ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Landmark size={48} className="text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Caja Cerrada</h3>
                        <p className="text-gray-600 mb-4">Debes abrir la caja para registrar ventas.</p>
                        <button onClick={() => setView('cash-register')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            Ir a Gestión de Caja
                        </button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-bold border-b pb-3 mb-4 flex items-center"><ShoppingCart className="mr-2"/> Carrito</h3>
                        {cart.length === 0 ? <p className="text-gray-500 flex-grow text-center mt-20">El carrito está vacío</p> : (
                            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                                {cart.map(item => (
                                    <div key={item.cartId} className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="font-semibold">{item.name} <span className="text-xs font-mono text-gray-400">({item.lotNumber})</span></p>
                                            <p className="text-sm text-gray-500">{item.quantity} x {item.sellType} @ S/ {item.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="w-20 text-right font-bold">S/ {(item.price * item.quantity).toFixed(2)}</p>
                                            <button onClick={() => removeFromCart(item.cartId)} className="ml-2 text-red-500 hover:text-red-700" title="Quitar producto"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="border-t pt-4 mt-auto">
                            <div className="flex justify-between items-center text-2xl font-bold mb-4"><span>TOTAL</span><span>S/ {total.toFixed(2)}</span></div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleCompleteSale('Efectivo')} disabled={cart.length === 0 || isProcessing} className="w-full bg-green-500 text-white p-4 rounded-lg text-lg font-bold hover:bg-green-600 disabled:bg-gray-400 flex items-center justify-center">
                                    {isProcessing ? "Procesando..." : <><DollarSign className="mr-2" /> Efectivo</>}
                                </button>
                                <button onClick={() => handleCompleteSale('Yape')} disabled={cart.length === 0 || isProcessing} className="w-full bg-purple-600 text-white p-4 rounded-lg text-lg font-bold hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center">
                                    {isProcessing ? "Procesando..." : <>Yape</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {selectedProduct && <Modal onClose={() => setSelectedProduct(null)}><AddToCartModal product={selectedProduct} lots={lots} cart={cart} onAddToCart={addToCart} onClose={() => setSelectedProduct(null)} showNotification={showNotification} /></Modal>}
        </div>
    );
};
export default PointOfSale;