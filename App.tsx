
import React, { useState, useEffect } from 'react';
import { Sun, Moon, BookOpen, Settings as SettingsIcon, Sparkles, ChevronLeft, ChevronRight, ArrowRight, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- الإعدادات والثوابت ---
const HIZB_COUNT = 60;
const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const SPECIAL_SURAHS: Record<string, number> = { "الكهف": 18, "يس": 36, "الواقعة": 56, "تبارك": 67 };

// --- منطق الحسابات ---
const calculateRatib = (targetDate: Date, baseDate: Date, startHizb: number) => {
  let hizbPointer = startHizb;
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const current = new Date(baseDate);
  current.setHours(0, 0, 0, 0);

  let morningText = "";
  let eveningText = "";
  let mNum: number | undefined;
  let eNum: number | undefined;

  // المحاكاة من تاريخ البدء إلى التاريخ المختار
  while (current <= target) {
    const dayOfWeek = current.getDay();
    const isLastDay = current.getTime() === target.getTime();

    // ورد الصباح
    if (dayOfWeek === 5) { // الجمعة صباحاً
      if (isLastDay) morningText = "يس، الواقعة، تبارك";
    } else {
      if (isLastDay) {
        morningText = `الحزب ${hizbPointer}`;
        mNum = hizbPointer;
      }
      hizbPointer = (hizbPointer % HIZB_COUNT) + 1;
    }

    // ورد المساء
    if (dayOfWeek === 4) { // الخميس مساءً
      if (isLastDay) eveningText = "سورة الكهف";
    } else {
      if (isLastDay) {
        eveningText = `الحزب ${hizbPointer}`;
        eNum = hizbPointer;
      }
      hizbPointer = (hizbPointer % HIZB_COUNT) + 1;
    }

    if (isLastDay) break;
    current.setDate(current.getDate() + 1);
  }
  return { morningText, eveningText, mNum, eNum };
};

// --- مكون القارئ القرآني ---
const QuranReader = ({ title, hizbNum, surahNames, onClose }: any) => {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      let ayahs: any[] = [];
      try {
        if (hizbNum) {
          const res = await fetch(`https://api.alquran.cloud/v1/hizb/${hizbNum}/ar.warsh`);
          const data = await res.json();
          ayahs = data.data.ayahs;
        } else if (surahNames) {
          const names = surahNames.split('،').map((s: string) => s.trim());
          for (const name of names) {
            const num = SPECIAL_SURAHS[name];
            if (num) {
              const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/ar.warsh`);
              const data = await res.json();
              ayahs = [...ayahs, ...data.data.ayahs];
            }
          }
        }
        setContent(ayahs);
      } catch (e) {
        console.error("Error loading Quran:", e);
      }
      setLoading(false);
    };
    loadData();
  }, [hizbNum, surahNames]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <header className="bg-emerald-900 text-white p-5 flex items-center justify-between shadow-xl">
        <button onClick={onClose} className="p-2 hover:bg-emerald-800 rounded-full"><ArrowRight size={24} /></button>
        <div className="text-center">
          <h2 className="text-xl font-bold quran-font">{title}</h2>
          <p className="text-[10px] opacity-70">رواية ورش عن نافع</p>
        </div>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 overflow-y-auto paper-bg p-8">
        {loading ? (
          <div className="h-full flex items-center justify-center font-bold text-emerald-800">جاري فتح المصحف...</div>
        ) : (
          <div className="max-w-3xl mx-auto text-right">
            {content.map((ayah, i) => (
              <React.Fragment key={i}>
                <span className="quran-font text-2xl md:text-3xl leading-[2.8]">{ayah.text}</span>
                <span className="ayah-num">{ayah.numberInSurah}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- التطبيق الرئيسي ---
export default function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem('hizb_settings');
    return saved ? JSON.parse(saved) : { startDate: new Date().toISOString(), startHizb: 1 };
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reflection, setReflection] = useState<string>("");
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [reader, setReader] = useState<any>({ isOpen: false });

  const readings = calculateRatib(selectedDate, new Date(state.startDate), state.startHizb);

  const getAiReflection = async () => {
    setIsLoadingReflection(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أعطني تدبراً روحانياً قصيراً جداً ومحفزاً (30 كلمة) لورد اليوم: ${readings.morningText} و ${readings.eveningText}`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setReflection(response.text);
    } catch {
      setReflection("أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ.");
    }
    setIsLoadingReflection(false);
  };

  useEffect(() => {
    localStorage.setItem('hizb_settings', JSON.stringify(state));
  }, [state]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-20">
      <header className="w-full bg-emerald-900 text-white py-14 px-4 text-center shadow-2xl relative">
        <h1 className="text-4xl font-bold quran-font">الحزب الراتب</h1>
        <p className="text-emerald-200 mt-2 text-sm">نظام ورد الصباح والمساء</p>
      </header>

      <main className="w-full max-w-xl px-4 mt-[-2.5rem] space-y-6">
        {/* محدد التاريخ */}
        <div className="bg-white p-5 rounded-3xl shadow-lg flex items-center justify-between border border-emerald-50">
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-2"><ChevronRight /></button>
          <div className="text-center">
            <h2 className="text-lg font-bold">{WEEKDAYS_AR[selectedDate.getDay()]}، {selectedDate.getDate()} {MONTHS_AR[selectedDate.getMonth()]}</h2>
          </div>
          <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-2"><ChevronLeft /></button>
        </div>

        {/* الكروت */}
        <div className="grid gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-md border-r-8 border-amber-400">
            <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold"><Sun size={20}/> ورد الصباح</div>
            <p className="text-2xl font-bold quran-font mb-4">{readings.morningText}</p>
            <button onClick={() => setReader({ isOpen: true, title: "ورد الصباح", hizbNum: readings.mNum, surahNames: readings.mNum ? null : readings.morningText })} className="w-full py-3 bg-emerald-800 text-white rounded-2xl font-bold active:scale-95 transition-all">اقرأ الورد</button>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-md border-r-8 border-indigo-500">
            <div className="flex items-center gap-2 text-indigo-600 mb-2 font-bold"><Moon size={20}/> ورد المساء</div>
            <p className="text-2xl font-bold quran-font mb-4">{readings.eveningText}</p>
            <button onClick={() => setReader({ isOpen: true, title: "ورد المساء", hizbNum: readings.eNum, surahNames: readings.eNum ? null : readings.eveningText })} className="w-full py-3 bg-emerald-800 text-white rounded-2xl font-bold active:scale-95 transition-all">اقرأ الورد</button>
          </div>
        </div>

        {/* التدبر */}
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-emerald-900 flex items-center gap-2"><Sparkles size={18} className="text-amber-500"/> تدبر اليوم</span>
            <button onClick={getAiReflection} className="p-1 hover:rotate-180 transition-transform"><RefreshCw size={16} className="text-emerald-700"/></button>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 italic">{isLoadingReflection ? "جاري التدبر..." : reflection || "اضغط على زر التحديث للحصول على لمحة إيمانية."}</p>
        </div>

        {/* الإعدادات */}
        <button onClick={() => setIsSettingsOpen(true)} className="w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2">
          <SettingsIcon size={20} /> تعديل نقطة البداية
        </button>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[110]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8">
             <h2 className="text-xl font-bold mb-6 text-center">ضبط ورد البداية</h2>
             <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500">رقم الحزب الذي تبدأ به (صباح اليوم):</label>
                <input type="number" min="1" max="60" defaultValue={state.startHizb} onChange={(e) => setState({ ...state, startHizb: Number(e.target.value) })} className="w-full p-4 bg-slate-50 border rounded-2xl text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-emerald-800 text-white rounded-2xl font-bold mt-4">حفظ وإغلاق</button>
             </div>
          </div>
        </div>
      )}

      {reader.isOpen && <QuranReader {...reader} onClose={() => setReader({ isOpen: false })} />}
    </div>
  );
}
