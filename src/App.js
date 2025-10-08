import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [yaziSayisi, setYaziSayisi] = useState(0);
  const [kelimeSayisi, setKelimeSayisi] = useState(0);
  const [metin, setMetin] = useState('');
  const [gecmis, setGecmis] = useState([]);

  // Sayfa ilk açıldığında kayıtlı geçmişi yükle
  useEffect(() => {
    const kayitliGecmis = JSON.parse(localStorage.getItem('yazimGecmisi')) || [];
    setGecmis(kayitliGecmis);
  }, []);

  // Metin değiştikçe karakter ve kelime sayısını hesapla
  const handleChange = (e) => {
    const text = e.target.value;
    setMetin(text);
    setYaziSayisi(text.length);
    const kelimeler = text.trim().split(/\s+/);
    setKelimeSayisi(text.trim() === '' ? 0 : kelimeler.length);
  };

  // Yazıyı kaydet
  const handleSave = () => {
    const yeniKayit = {
      tarih: new Date().toLocaleString(),
      karakter: yaziSayisi,
      kelime: kelimeSayisi,
    };
    const yeniGecmis = [yeniKayit, ...gecmis];
    setGecmis(yeniGecmis);
    localStorage.setItem('yazimGecmisi', JSON.stringify(yeniGecmis));
    setMetin('');
    setYaziSayisi(0);
    setKelimeSayisi(0);
  };

  return (
    <div
      style={{
        backgroundColor: '#0f0f0f',
        color: '#f0f0f0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
      }}
    >
      <h1 style={{ color: '#00ffcc', marginBottom: '20px' }}>⌨️ Klavye Sayacı</h1>

      <textarea
        value={metin}
        onChange={handleChange}
        placeholder="Buraya yaz..."
        style={{
          width: '80%',
          height: '200px',
          fontSize: '18px',
          padding: '12px',
          borderRadius: '12px',
          border: '2px solid #00ffcc',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          resize: 'none',
          outline: 'none',
          boxShadow: '0 0 10px #00ffcc44',
        }}
      />

      <div
        style={{
          marginTop: '20px',
          backgroundColor: '#1a1a1a',
          padding: '15px 30px',
          borderRadius: '12px',
          border: '1px solid #00ffcc33',
          boxShadow: '0 0 10px #00ffcc22',
          textAlign: 'center',
        }}
      >
        <p>🧾 <strong>Karakter sayısı:</strong> {yaziSayisi}</p>
        <p>📝 <strong>Kelime sayısı:</strong> {kelimeSayisi}</p>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#00ffcc',
            color: '#0f0f0f',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            marginTop: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          💾 Kaydet
        </button>
      </div>

      {gecmis.length > 0 && (
        <div style={{ marginTop: '30px', width: '80%' }}>
          <h2 style={{ color: '#00ffcc' }}>📜 Geçmiş Yazılar</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gecmis.map((kayit, i) => (
              <li
                key={i}
                style={{
                  backgroundColor: '#1a1a1a',
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #00ffcc33',
                }}
              >
                <p><strong>Tarih:</strong> {kayit.tarih}</p>
                <p><strong>Karakter:</strong> {kayit.karakter} — <strong>Kelime:</strong> {kayit.kelime}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

