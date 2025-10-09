import React, { useState, useEffect } from 'react';
import './App.css'; 

// =========================================================
// A. TANIMLANAN METİNLER
// =========================================================
const KAYNAK_METINLERI = [
  { id: 1, text: "React, kullanıcı arayüzleri oluşturmak için kullanılan açık kaynaklı bir JavaScript kütüphanesidir. Bileşen tabanlı yapısı sayesinde, büyük ölçekli ve hızlı uygulamalar geliştirmeyi kolaylaştırır. Git ve GitHub, projelerin versiyon kontrolü ve işbirliği için vazgeçilmez araçlardır." },
  { id: 2, text: "Yapay zeka (YZ), makinelerin insan benzeri zeka gösterme yeteneği üzerine kurulu bir bilgisayar bilimi dalıdır. Öğrenme, problem çözme ve karar verme gibi görevleri otomatize etmeyi hedefler." },
  { id: 3, text: "Modern web geliştirme süreçleri, genellikle frontend ve backend olarak ikiye ayrılır. Frontend, kullanıcının gördüğü arayüzle ilgilenirken, backend sunucu tarafındaki veri yönetimi ve iş mantığını yürütür." },
];

// =========================================================
// B. ZAMANLAYICI SEÇENEKLERİ (Saniye cinsinden)
// =========================================================
const ZAMAN_SECENEKLERI = [
  { value: 60, label: "1 Dakika" },
  { value: 180, label: "3 Dakika" },
  { value: 300, label: "5 Dakika" },
  { value: Infinity, label: "Sınırsız" },
];

function App() {
  // Durum Yönetimi (State Management)
  const [inputText, setInputText] = useState('');
  const [selectedText, setSelectedText] = useState(KAYNAK_METINLERI[0].text); 
  const [isTyping, setIsTyping] = useState(false); 
  const [timeLeft, setTimeLeft] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [selectedTime, setSelectedTime] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [errorCount, setErrorCount] = useState(0); 

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
    }
    
    // Hata kontrolünü güncelle
    updateErrorCount(newText);
  };
  
  // Hata Sayısını Hesaplayan Fonksiyon
  const updateErrorCount = (currentInput) => {
      let errors = 0;
      for (let i = 0; i < currentInput.length; i++) {
          if (currentInput[i] !== selectedText[i]) {
              errors++;
          }
      }
      setErrorCount(errors);
  };
  
  // Metin Seçimini Değiştirme
  const handleTextChange = (event) => {
    const newTextId = parseInt(event.target.value);
    const newText = KAYNAK_METINLERI.find(item => item.id === newTextId).text;
    setSelectedText(newText);
    resetTest();
  };

  // Zaman Seçimini Değiştirme
  const handleTimeChange = (event) => {
    const newTime = parseInt(event.target.value);
    setSelectedTime(newTime);
    resetTest(newTime);
  };
  
  // Testi Sıfırlama Fonksiyonu
  const resetTest = (newTime = selectedTime) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(newTime);
    setErrorCount(0);
  };

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    if (isTyping && timeLeft > 0 && selectedTime !== Infinity) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } 
    
    if (timeLeft === 0) {
        setIsTyping(false);
        clearInterval(timer);
    }

    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime]);


  // Metin ve Kelime Sayacı Hesaplamaları
  const characterCount = inputText.length;
  const wordCount = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).length;
  
  // Zamanı dakika:saniye formatında göster
  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // KAYNAK METNİ RENDER EDEN FONKSİYON
  const renderSourceText = () => {
    return selectedText.split('').map((char, index) => {
      let charClass = '';
      
      if (index < inputText.length) {
        charClass = char === inputText[index] ? 'correct' : 'incorrect';
      }
      else if (index === inputText.length) {
        charClass = 'current';
      }
      
      return (
        <span key={index} className={charClass}>
          {char}
        </span>
      );
    });
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Klavye Sayacı & Hız Testi</h1>
      </header>

      {/* ZAMAN VE METİN SEÇİM ALANI */}
      <div className="kontrol-alanı">
        {/* Metin Seçimi */}
        <label htmlFor="text-select">Metin Seç:</label>
        <select id="text-select" onChange={handleTextChange}>
          {KAYNAK_METINLERI.map((item) => (
            <option key={item.id} value={item.id}>
              Metin {item.id}
            </option>
          ))}
        </select>
        
        {/* Zaman Seçimi */}
        <label htmlFor="time-select">Süre Seç:</label>
        <select id="time-select" onChange={handleTimeChange} value={selectedTime}>
          {ZAMAN_SECENEKLERI.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* ZAMANLAYICI GÖSTERGESİ */}
      <div className="timer-gosterge">
        {selectedTime !== Infinity && (
            <p>Kalan Süre: {formatTime(timeLeft)}</p>
        )}
      </div>

      {/* KAYNAK METİN KUTUSU */}
      <div className="kaynak-metin-kutusu">
        {renderSourceText()}
      </div>

      {/* YAZMA ALANI */}
      <textarea
        placeholder={timeLeft === 0 ? "Süre doldu! Yeni bir test başlatın." : "Buraya yaz..."}
        value={inputText}
        onChange={handleInputChange}
        disabled={timeLeft === 0 && selectedTime !== Infinity}
        rows="8"
      />

      {/* SAYICI VE BUTONLAR */}
      <div className="bilgi-alanı">
        <p>Doğru Karakter Sayısı: {characterCount - errorCount}</p>
        <p>Hata Sayısı: {errorCount}</p>
        <p>Kelime Sayısı: {wordCount}</p>
        <button className="kaydet-btn" disabled={isTyping && timeLeft > 0}>Kaydet/Sonuçlandır</button>
        <button className="sifirla-btn" onClick={() => resetTest()}>Sıfırla</button>
      </div>
    </div>
  );
}

export default App;