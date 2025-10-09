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
  const [initialTime, setInitialTime] = useState(ZAMAN_SECENEKLERI[0].value); // Yeni: Başlangıç zamanını tutar
  const [result, setResult] = useState(null); // Yeni: Sonuçları saklar (DBK, Doğruluk)

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
      // İlk yazmaya başlandığında süreyi kaydet
      setInitialTime(selectedTime); 
    }
    
    // Hata kontrolünü güncelle
    updateErrorCount(newText);
    
    // Eğer tüm metin doğru yazıldıysa, testi sonlandır
    if (newText === selectedText) {
        finishTest();
    }
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
  
  // Testi Sonlandırma ve Sonuçları Hesaplama Fonksiyonu
  const finishTest = () => {
    // 1. Yazmayı durdur
    setIsTyping(false); 

    // 2. Kullanılan süreyi hesapla (saniye cinsinden)
    let timeSpentSeconds;
    if (selectedTime === Infinity) {
        // Sınırsız modda veya metin bitince:
        // Eğer metin bittiyse ve süre hala Infinity'de ise burayı basitleştiriyoruz, 
        // normalde bu modda başlangıç ve bitiş zamanları tutulmalıydı. 
        // Şimdilik DBK'yı hesaplamayalım veya sıfır gösterelim (geliştirilecek).
        timeSpentSeconds = 0; 
    } else {
        // Zamanlı modda: Başlangıç Süresi - Kalan Süre
        timeSpentSeconds = initialTime - timeLeft;
    }
    
    // 3. Yazılan doğru kelime sayısını bul
    const currentInputWords = inputText.trim().split(/\s+/).filter(Boolean);
    let correctWords = 0;
    
    // Sadece kaynak metindeki kelimelerle eşleşenleri doğru kelime say
    const sourceWords = selectedText.trim().split(/\s+/).filter(Boolean);
    
    for(let i = 0; i < currentInputWords.length; i++){
        if(sourceWords[i] && currentInputWords[i] === sourceWords[i]){
            correctWords++;
        }
    }
    
    // 4. DBK (WPM) Hesapla (Dakika Başına Kelime)
    const timeSpentMinutes = timeSpentSeconds / 60;
    // Eğer süre harcanmadıysa (timeSpentMinutes === 0), DBK hesaplamaktan kaçın.
    const calculatedWPM = timeSpentMinutes > 0 ? Math.round(correctWords / timeSpentMinutes) : 0;
    
    // 5. Doğruluk Yüzdesi Hesapla
    const totalCharsTyped = inputText.length;
    const accuracy = totalCharsTyped > 0 ? ((totalCharsTyped - errorCount) / totalCharsTyped) * 100 : 0;
    
    // 6. Sonucu kaydet
    setResult({
        wpm: calculatedWPM,
        accuracy: accuracy.toFixed(2), // 2 ondalık basamağa yuvarla
        correctWords: correctWords,
        totalWordsTyped: currentInputWords.length
    });
    
    // Kalan süreyi sıfırla (eğer sınırsız modda değilsek)
    if (selectedTime !== Infinity) {
        setTimeLeft(0);
    }
  };

  // Testi Sıfırlama Fonksiyonu
  const resetTest = (newTime = selectedTime) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(newTime);
    setSelectedTime(newTime);
    setInitialTime(newTime);
    setErrorCount(0);
    setResult(null); // Sonucu sıfırla
  };

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    if (isTyping && timeLeft > 0 && selectedTime !== Infinity) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } 
    
    // Eğer zaman biterse, testi sonlandır
    if (timeLeft === 0 && isTyping) {
        finishTest();
    }

    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime]);


  // Metin ve Kelime Sayacı Hesaplamaları
  const characterCount = inputText.length;
  // Sadece boşlukları baz alarak tahmini kelime sayısını hesapla
  const wordCount = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length;
  
  // Zamanı dakika:saniye formatında göster
  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // KAYNAK METNİ RENDER EDEN FONKSİYON
  const renderSourceText = () => {
    return selectedText.split('').