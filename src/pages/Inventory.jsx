import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
// --- CAMBIO AQUÍ 1 ---
// Importamos más funciones de firestore para la consulta y borrado en lote
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore'; 
// --- CAMBIO AQUÍ 2 ---
// Importamos el ícono de basura
import { PlusCircle, Edit, Layers, ChevronDown, Archive, Eye, Trash2 } from 'lucide-react'; 
import Modal from '../components/common/Modal';

// --- El componente ProductForm no cambia ---
const ProductForm = ({ product, onClose, showNotification }) => {
    const [formData, setFormData] = useState(
        product || { name: '', category: '', presentation: '', laboratory: '' }
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (product) {
            await updateDoc(doc(db, 'products', product.id), formData);
            showNotification('Producto actualizado con éxito');
        } else {
            await addDoc(collection(db, 'products'), formData);
            showNotification('Nuevo producto maestro creado');
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">{product ? 'Editar Producto' : 'Añadir Producto Maestro'}</h2>
            <p className="text-sm text-gray-500 mb-4">Aquí se crea la ficha general del producto. Los lotes con stock se añaden después.</p>
            
            <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del Producto (ej. Ibuprofeno 500mg)" className="w-full p-2 border rounded" required />
            
            <label className="block text-sm font-medium text-gray-700">Laboratorio</label>
            <input name="laboratory" value={formData.laboratory} onChange={handleChange} placeholder="Laboratorio" className="w-full p-2 border rounded" required />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Categoría (Tipo)</label>
                    <input name="category" value={formData.category} onChange={handleChange} placeholder="Ej: Analgésico, Vitamina" className="w-full p-2 border rounded" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Presentación (Forma)</label>
                    <input name="presentation" value={formData.presentation} onChange={handleChange} placeholder="Ej: Caja, Frasco, Gotero" className="w-full p-2 border rounded" />
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{product ? 'Actualizar' : 'Guardar'}</button></div>
        </form>
    );
};

// --- El componente LotForm no cambia ---
const LotForm = ({ lot, product, onClose, showNotification }) => {
     const [formData, setFormData] = useState(
        lot || {
            lotNumber: '', acquisitionCost: '', price: '', stock: '', lowStockThreshold: '5', expiryDate: '',
            sellsByBlister: false, unitsPerBlister: '', pricePerBlister: '',
            sellsByBox: false, unitsPerBox: '', pricePerBox: ''
        }
    );

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            lotNumber: formData.lotNumber,
            acquisitionCost: parseFloat(formData.acquisitionCost) || 0,
            price: parseFloat(formData.price) || 0,
            stock: parseInt(formData.stock) || 0,
            lowStockThreshold: parseInt(formData.lowStockThreshold) || 0,
            expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
            sellsByBlister: formData.sellsByBlister,
            unitsPerBlister: formData.sellsByBlister ? (parseInt(formData.unitsPerBlister) || 0) : 0,
            pricePerBlister: formData.sellsByBlister ? (parseFloat(formData.pricePerBlister) || 0) : 0,
            sellsByBox: formData.sellsByBox,
            unitsPerBox: formData.sellsByBox ? (parseInt(formData.unitsPerBox) || 0) : 0,
            pricePerBox: formData.sellsByBox ? (parseFloat(formData.pricePerBox) || 0) : 0,
        };

        if(lot) {
            await updateDoc(doc(db, 'productLots', lot.id), dataToSave);
            showNotification('Lote actualizado con éxito');
        } else {
            const newData = {
                ...dataToSave,
                productId: product.id,
                name: product.name,
                laboratory: product.laboratory,
                category: product.category,
                presentation: product.presentation,
                isActive: true,
            };
            await addDoc(collection(db, 'productLots'), newData);
            showNotification('Nuevo lote añadido con éxito');
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <h2 className="text-2xl font-bold mb-4">{lot ? 'Editar Lote' : 'Añadir Nuevo Lote'} para <span className="text-blue-600">{product.name}</span></h2>
             <div className="grid grid-cols-2 gap-4">
                <input name="lotNumber" value={formData.lotNumber} onChange={handleChange} placeholder="Número de Lote" className="w-full p-2 border rounded" required />
                <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="Stock (Unidades)" className="w-full p-2 border rounded" required />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <input name="acquisitionCost" type="number" step="0.01" value={formData.acquisitionCost} onChange={handleChange} placeholder="Costo Adquisición (Unidad)" className="w-full p-2 border rounded" required />
                <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="Precio Venta (Unidad)" className="w-full p-2 border rounded" required />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Alerta de Stock Bajo</label>
                    <input name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                    <input name="expiryDate" type="date" value={formData.expiryDate} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                </div>
            </div>
            <div className="p-4 border-t border-b space-y-4">
                <label className="flex items-center space-x-3"><input type="checkbox" name="sellsByBlister" checked={formData.sellsByBlister} onChange={handleChange} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"/><span className="font-medium text-gray-700">Vender por blíster</span></label>
                {formData.sellsByBlister && ( <div className="grid grid-cols-2 gap-4"><input name="unitsPerBlister" type="number" value={formData.unitsPerBlister} onChange={handleChange} placeholder="Unidades por Blíster" className="w-full p-2 border rounded" required/><input name="pricePerBlister" type="number" step="0.01" value={formData.pricePerBlister} onChange={handleChange} placeholder="Precio Blíster (S/.)" className="w-full p-2 border rounded" required/></div>)}
            </div>
            <div className="p-4 border-b space-y-4">
                 <label className="flex items-center space-x-3"><input type="checkbox" name="sellsByBox" checked={formData.sellsByBox} onChange={handleChange} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"/><span className="font-medium text-gray-700">Vender por caja</span></label>
                {formData.sellsByBox && (<div className="grid grid-cols-2 gap-4"><input name="unitsPerBox" type="number" value={formData.unitsPerBox} onChange={handleChange} placeholder="Unidades por Caja" className="w-full p-2 border rounded" required/><input name="pricePerBox" type="number" step="0.01" value={formData.pricePerBox} onChange={handleChange} placeholder="Precio Caja (S/.)" className="w-full p-2 border rounded" required/></div>)}
            </div>
            <div className="flex justify-end space-x-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{lot ? 'Actualizar' : 'Guardar'}</button></div>
        </form>
    );
};

// --- Componente principal de la página de Inventario ---
const Inventory = ({ showNotification }) => {
    const [products, setProducts] = useState([]);
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeAccordion, setActiveAccordion] = useState(null);
    
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showLotModal, setShowLotModal] = useState(false);
    const [editingLot, setEditingLot] = useState(null);
    const [currentProductForLot, setCurrentProductForLot] = useState(null);

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

    const handleOpenProductModal = (product = null) => { 
        setEditingProduct(product); 
        setShowProductModal(true); 
    };
    
    const handleOpenLotModal = (product, lot = null) => {
        if (lot) {
            const lotData = {
                ...lot,
                expiryDate: lot.expiryDate ? lot.expiryDate.toDate().toISOString().split('T')[0] : ''
            };
            setEditingLot(lotData);
        } else {
            setEditingLot(null);
        }
        setCurrentProductForLot(product);
        setShowLotModal(true);
    };

    const handleArchiveLot = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        const message = newStatus ? '¿Reactivar este lote?' : '¿Archivar este lote? El stock se establecerá en 0.';
        if (window.confirm(message)) {
            const updateData = { isActive: newStatus };
            if (!newStatus) updateData.stock = 0;
            await updateDoc(doc(db, 'productLots', id), updateData);
            showNotification(`Lote ${newStatus ? 'reactivado' : 'archivado'}.`);
        }
    };

    // --- CAMBIO AQUÍ 3 ---
    // Nueva función para eliminar un producto maestro y todos sus lotes
    const handleDeleteProduct = async (productId) => {
        const confirmation = window.confirm(
            "ADVERTENCIA: ¿Estás seguro de que quieres eliminar este producto maestro? Se eliminarán también TODOS sus lotes asociados. Esta acción no se puede deshacer."
        );

        if (!confirmation) {
            return;
        }

        try {
            // Iniciar un borrado por lotes (batch)
            const batch = writeBatch(db);

            // 1. Encontrar y eliminar todos los lotes asociados
            const lotsQuery = query(collection(db, 'productLots'), where('productId', '==', productId));
            const lotsSnapshot = await getDocs(lotsQuery);
            lotsSnapshot.forEach((lotDoc) => {
                batch.delete(lotDoc.ref); // Añadir la eliminación del lote al batch
            });

            // 2. Eliminar el producto maestro
            const productRef = doc(db, 'products', productId);
            batch.delete(productRef); // Añadir la eliminación del producto al batch

            // 3. Ejecutar todas las operaciones del batch
            await batch.commit();

            showNotification('Producto y sus lotes eliminados con éxito.', 'success');
            // La actualización de la UI se dará automáticamente por los listeners (onSnapshot)
        } catch (error) {
            console.error("Error al eliminar el producto y sus lotes: ", error);
            showNotification('Ocurrió un error al eliminar el producto.', 'error');
        }
    };


    const toggleAccordion = (productId) => {
        setActiveAccordion(activeAccordion === productId ? null : productId);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.laboratory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Inventario por Productos</h1>
                <button onClick={() => handleOpenProductModal()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow"><PlusCircle size={20} className="mr-2" /> Añadir Producto Maestro</button>
            </div>
            
            <input type="text" placeholder="Buscar por nombre o laboratorio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 border rounded-lg mb-4 shadow-sm" />

            {loading ? <p>Cargando...</p> : (
                <div className="space-y-4">
                    {filteredProducts.map(product => {
                        const productLots = lots.filter(l => l.productId === product.id);
                        const totalStock = productLots.reduce((sum, l) => sum + (l.isActive ? l.stock : 0), 0);
                        return (
                            <div key={product.id} className="bg-white rounded-lg shadow-md">
                                <button onClick={() => toggleAccordion(product.id)} className="w-full p-4 flex justify-between items-center text-left">
                                    <div>
                                        <h3 className="font-bold text-lg">{product.name}</h3>
                                        <p className="text-sm text-gray-500">{product.laboratory} - <span className="font-medium capitalize">{product.presentation || 'N/A'}</span></p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {/* --- CAMBIO AQUÍ 4 --- */}
                                        {/* Añadimos el botón de eliminar. e.stopPropagation() evita que se abra el acordeón al hacer clic */}
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-gray-400 hover:text-red-600" title="Eliminar Producto Maestro">
                                            <Trash2 size={18} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenProductModal(product); }} className="text-gray-400 hover:text-blue-600" title="Editar Producto Maestro">
                                            <Edit size={18} />
                                        </button>
                                        <span className="text-gray-700">Stock Total: <span className="font-bold">{totalStock}</span></span>
                                        <ChevronDown className={`transform transition-transform ${activeAccordion === product.id ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {activeAccordion === product.id && (
                                    <div className="border-t p-4">
                                        <div className="flex justify-end mb-2">
                                            <button onClick={() => handleOpenLotModal(product)} className="flex items-center px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"><Layers size={14} className="mr-1"/> Añadir Lote</button>
                                        </div>
                                        <table className="w-full table-auto text-sm">
                                            <thead className="bg-gray-50"><tr><th className="p-2 text-left font-medium text-gray-500">Lote</th><th className="p-2 text-right font-medium text-gray-500">Stock</th><th className="p-2 text-right font-medium text-gray-500">Precio Venta</th><th className="p-2 text-center font-medium text-gray-500">Vence</th><th className="p-2 text-center font-medium text-gray-500">Estado</th><th className="p-2 text-center font-medium text-gray-500">Acciones</th></tr></thead>
                                            <tbody className="divide-y">
                                                {productLots.map(lot => {
                                                    const today = new Date();
                                                    const isExpired = lot.expiryDate && lot.expiryDate.toDate() < today;
                                                    const isExpiringSoon = lot.expiryDate && !isExpired && lot.expiryDate.toDate() <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                                                    
                                                    return (
                                                        <tr key={lot.id} className={`${!lot.isActive ? 'bg-gray-100 text-gray-400' : isExpired ? 'bg-red-50 text-red-800' : isExpiringSoon ? 'bg-yellow-50' : ''}`}>
                                                            <td className="p-2">
                                                                {lot.lotNumber}
                                                                {isExpired && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded">VENCIDO</span>}
                                                                {isExpiringSoon && !isExpired && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">POR VENCER</span>}
                                                            </td>
                                                            <td className="p-2 text-right">{lot.stock}</td>
                                                            <td className="p-2 text-right">S/ {lot.price.toFixed(2)}</td>
                                                            <td className="p-2 text-center">
                                                                {lot.expiryDate ? (
                                                                    <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-yellow-600 font-bold' : ''}>
                                                                        {lot.expiryDate.toDate().toLocaleDateString('es-ES')}
                                                                    </span>
                                                                ) : 'N/A'}
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lot.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {lot.isActive ? 'Activo' : 'Archivado'}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center space-x-2">
                                                                <button onClick={() => handleOpenLotModal(product, lot)} className="text-blue-600 hover:text-blue-900" title="Editar Lote"><Edit size={16} /></button>
                                                                <button onClick={() => handleArchiveLot(lot.id, lot.isActive)} className={`${lot.isActive ? 'text-gray-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`} title={lot.isActive ? 'Archivar Lote' : 'Reactivar Lote'}>
                                                                    {lot.isActive ? <Archive size={16} /> : <Eye size={16}/>}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
            {showProductModal && <Modal onClose={() => setShowProductModal(false)}><ProductForm product={editingProduct} onClose={() => setShowProductModal(false)} showNotification={showNotification} /></Modal>}
            {showLotModal && <Modal onClose={() => setShowLotModal(false)}><LotForm lot={editingLot} product={currentProductForLot} onClose={() => setShowLotModal(false)} showNotification={showNotification} /></Modal>}
        </div>
    );
};
export default Inventory;