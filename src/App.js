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

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
    }
  };

  // Metin Seçimini Değiştirme
  const handleTextChange = (event) => {
    const newTextId = parseInt(event.target.value);
    const newText = KAYNAK_METINLERI.find(item => item.id === newTextId).text;
    setSelectedText(newText);
    // Yazma alanını ve zamanlayıcıyı sıfırla
    resetTest();
  };

  // Zaman Seçimini Değiştirme
  const handleTimeChange = (event) => {
    const newTime = parseInt(event.target.value);
    setSelectedTime(newTime);
    // Zamanı ve testi sıfırla
    resetTest(newTime);
  };
  
  // Testi Sıfırlama Fonksiyonu
  const resetTest = (newTime = selectedTime) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(newTime);
  };

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    // Eğer yazmaya başlanmışsa VE zaman sınırsız değilse VE zaman bitmemişse
    if (isTyping && timeLeft > 0 && selectedTime !== Infinity) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } 
    
    // Eğer zaman biterse, yazmayı durdur
    if (timeLeft === 0) {
        setIsTyping(false);
        clearInterval(timer);
    }

    // Component temizlenirken timer'