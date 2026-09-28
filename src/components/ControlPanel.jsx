import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Settings, Upload, Type, Hash, X, Trash2 } from 'lucide-react';
import './ControlPanel.css';

const ControlPanel = ({ onUpdateItems, currentItems }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState(null); // 'range', 'excel', 'manual'
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(10);
    const [manualInput, setManualInput] = useState('');
    const [manualList, setManualList] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
        setIsOpen(false);
        setMode(null);
    };

    // --- Lógica de Rango ---
    const applyRange = () => {
        const newItems = [];
        for (let i = rangeStart; i <= rangeEnd; i++) {
            newItems.push(i.toString());
        }
        onUpdateItems(newItems);
        handleClose();
    };

    // --- Lógica de Excel ---
    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Extraer la primera columna (asumiendo que los nombres están ahí)
            // Filtrar vacíos y encabezados si es necesario
            const names = jsonData
                .flat()
                .filter(name => typeof name === 'string' && name.trim() !== '')
                .map(name => name.trim());

            // Si no hay nombres, intentar tomar todo el texto
            const finalItems = names.length > 0 ? names : jsonData.flat().filter(Boolean).map(String);

            if (finalItems.length > 0) {
                onUpdateItems(finalItems);
                handleClose();
            } else {
                alert("No se encontraron datos válidos en el Excel.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    // --- Lógica Manual ---
    const handleManualKeyDown = (e) => {
        if (e.key === 'Enter' && manualInput.trim() !== '') {
            setManualList([...manualList, manualInput.trim()]);
            setManualInput('');
        }
    };

    const applyManual = () => {
        if (manualList.length > 0) {
            onUpdateItems(manualList);
            handleClose();
        }
    };

    // Nueva función para limpiar la lista manual
    const clearManualList = () => {
        setManualList([]);
        setManualInput('');
    };

    return (
        <>
            <button className="btn-edit-top" onClick={handleOpen}>
                <Settings size={20} /> Edit Fields
            </button>

            {isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="btn-close" onClick={handleClose}><X size={24} /></button>
                        <h2>Configure Roulette</h2>
                        <p className="subtitle">Current items: {currentItems.length}</p>

                        {!mode && (
                            <div className="mode-selection">
                                <button onClick={() => setMode('range')} className="btn-mode">
                                    <Hash size={24} /> Number Range
                                </button>
                                <button onClick={() => setMode('excel')} className="btn-mode">
                                    <Upload size={24} /> Upload Excel
                                </button>
                                <button onClick={() => setMode('manual')} className="btn-mode">
                                    <Type size={24} /> Manual Input
                                </button>
                            </div>
                        )}

                        {mode === 'range' && (
                            <div className="form-group">
                                <h3>Number Range</h3>
                                <div className="row">
                                    <label>Start: <input type="number" value={rangeStart} onChange={(e) => setRangeStart(parseInt(e.target.value))} /></label>
                                    <label>End: <input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(parseInt(e.target.value))} /></label>
                                </div>
                                <button onClick={applyRange} className="btn-apply">Apply Range</button>
                            </div>
                        )}

                        {mode === 'excel' && (
                            <div className="form-group">
                                <h3>Upload Excel (Column A)</h3>
                                <div
                                    className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                >
                                    <Upload size={48} color="#007bff" />
                                    <p>Drag & Drop your .xlsx file here</p>
                                    <p className="small">or</p>
                                    <label className="btn-file">
                                        Browse File
                                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} hidden />
                                    </label>
                                </div>
                            </div>
                        )}

                        {mode === 'manual' && (
                            <div className="form-group">
                                <h3>Manual Input</h3>
                                <input
                                    type="text"
                                    placeholder="Type a name and press Enter"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onKeyDown={handleManualKeyDown}
                                    autoFocus
                                />
                                <div className="manual-list">
                                    {manualList.map((item, i) => <span key={i} className="tag">{item}</span>)}
                                </div>
                                <div className="manual-actions">
                                    <button
                                        onClick={clearManualList}
                                        className="btn-clear"
                                        disabled={manualList.length === 0 && manualInput === ''}
                                        title="Clear all entered names"
                                    >
                                        <Trash2 size={18} /> Clear
                                    </button>
                                    <button
                                        onClick={applyManual}
                                        className="btn-apply"
                                        disabled={manualList.length === 0}
                                    >
                                        Apply {manualList.length} Items
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ControlPanel;