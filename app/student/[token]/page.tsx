"use client";

import { use, useEffect, useState, useRef } from "react";
import { notFound } from "next/navigation";

// ⚠️ URL de votre API Étudiant Val Town
const API_URL = "https://ahmedelhaddedwk--0efe85843c9111f1b0e542b51c65c3df.web.val.run";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 70; 
const TIMELINE_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

const COLORS: Record<string, string> = {
  "Course": "bg-[#E5F3FF] border-[#0077D4] text-[#004A87]",
  "Communication": "bg-[#EAF5E9] border-[#2E7D32] text-[#1B5E20]",
  "Default": "bg-[#F3E8FF] border-[#7E22CE] text-[#4C1D95]",
};

const DOT_COLORS = [{ hex: "#3B82F6" }, { hex: "#A855F7" }, { hex: "#22C55E" }, { hex: "#F97316" }, { hex: "#EC4899" }, { hex: "#EF4444" }];

const API_TO_FRENCH_DAYS: Record<string, string> = {
  "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
  "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche"
};

const DAY_MAP_ICAL: Record<string, string> = {
    "Monday": "MO", "Tuesday": "TU", "Wednesday": "WE", "Thursday": "TH", "Friday": "FR", "Saturday": "SA", "Sunday": "SU",
    "Lundi": "MO", "Mardi": "TU", "Mercredi": "WE", "Jeudi": "TH", "Vendredi": "FR", "Samedi": "SA", "Dimanche": "SU"
};

// --- FONCTIONS UTILITAIRES ---
const getFrenchDayName = (d: Date) => DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];

function formatNotionHour(hour: number) {
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function formatExactTime(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function timeToMin(t: string) { 
  if(!t) return 0; 
  const [h, m] = t.split(':').map(Number); 
  return h * 60 + m; 
}

function generateMiniCalendar(baseMonth: Date, actualToday: Date) {
  const year = baseMonth.getFullYear();
  const month = baseMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const days = [];
  for (let i = 0; i < 42; i++) {
    const dateObj = new Date(year, month, i - offset + 1);
    const isCurrentMonth = dateObj.getMonth() === month;
    const isToday = dateObj.toDateString() === actualToday.toDateString();
    days.push({ dateObj, num: dateObj.getDate(), isCurrentMonth, isToday });
  }
  return days;
}

const ChevronRight = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const MenuItem = ({ label, isSelected, onClick }: any) => (
    <div onClick={onClick} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer text-[#37352f] transition-colors rounded-md">
        <div className="w-4 flex justify-center text-[#0077D4]">
            {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
        </div>
        <span className={isSelected ? "font-semibold" : ""}>{label}</span>
    </div>
);

const extractText = (val: any): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.value) return String(val.value);
    if (Array.isArray(val) && val.length > 0 && val[0].value) return String(val[0].value);
    return String(val);
};

export default function StudentPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Jour'); 
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [miniCalBaseDate, setMiniCalBaseDate] = useState(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isClassesMenuOpen, setIsClassesMenuOpen] = useState(true);
  const [isTypesMenuOpen, setIsTypesMenuOpen] = useState(true);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}?token=${token}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-[#0077D4] rounded-full animate-spin mb-4"></div>
      <span className="text-gray-400 text-sm font-medium mt-2">Synchronisation de l'agenda...</span>
    </div>
  );
  
  if (!data || !data.schedules) return notFound();

  // 🔥 CREATION DE DONNÉES 100% PROPRES DÈS LE DÉBUT
  const cleanedSchedules = data.schedules.map((course: any) => ({
      ...course,
      classNameStr: extractText(course.className),
      tutorStr: extractText(course.tutor),
      typeStr: extractText(course.type),
      examDateStr: extractText(course.examDate),
      endDateStr: extractText(course.endDate)
  }));

  const uniqueClasses = Array.from(new Set(cleanedSchedules.map((c: any) => c.classNameStr))).filter(Boolean) as string[];
  const uniqueTypes = Array.from(new Set(cleanedSchedules.map((c: any) => c.typeStr))).filter(Boolean) as string[];

  const toggleClass = (cls: string) => setSelectedClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  const toggleType = (typ: string) => setSelectedTypes(prev => prev.includes(typ) ? prev.filter(t => t !== typ) : [...prev, typ]);

  const currentMonday = new Date(selectedDate);
  const dayOffset = currentMonday.getDay() === 0 ? 6 : currentMonday.getDay() - 1;
  currentMonday.setDate(currentMonday.getDate() - dayOffset);
  const weekDays = Array.from({ length: 7 }).map((_, i) => { const d = new Date(currentMonday); d.setDate(currentMonday.getDate() + i); return d; });

  let filteredSchedules = [...cleanedSchedules];
  if (selectedClasses.length > 0) filteredSchedules = filteredSchedules.filter((c: any) => selectedClasses.includes(c.classNameStr));
  if (selectedTypes.length > 0) filteredSchedules = filteredSchedules.filter((c: any) => selectedTypes.includes(c.typeStr));

  const dayName = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][selectedDate.getDay()];
  const dailySchedules = filteredSchedules.filter((c: any) => (API_TO_FRENCH_DAYS[c.day] || c.day) === dayName);

  const currentHourCalc = currentTime.getHours() + currentTime.getMinutes() / 60;
  const timeLineTop = ((currentHourCalc - START_HOUR) / TOTAL_HOURS) * 100;
  const isSelectedToday = selectedDate.toDateString() === new Date().toDateString();
  const showTimeLine = isSelectedToday && currentHourCalc >= START_HOUR && currentHourCalc <= END_HOUR;

  const formatDate = (val: any) => {
    let str = val;
    if (!str || str === "null" || str === "À définir" || str === "") return "À définir";
    
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return str; 
  };

  const exportToICal = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EDWK//Calendar//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    cleanedSchedules.forEach((c: any) => {
        const dayKey = (API_TO_FRENCH_DAYS[c.day] || c.day);
        const dayCode = DAY_MAP_ICAL[dayKey];
        if (!dayCode || !c.startTime || !c.endTime) return;

        const [startH, startM] = c.startTime.split(':');
        const [endH, endM] = c.endTime.split(':');
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
        
        let untilStr = "";
        let endStr = c.endDateStr;
        if (endStr && endStr !== "null" && endStr !== "À définir" && endStr !== "") {
            let d;
            if (endStr.includes('/')) {
                const parts = endStr.split('/');
                if (parts.length === 3) d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
                d = new Date(endStr);
            }
            if (d && !isNaN(d.getTime())) untilStr = d.toISOString().replace(/[-:]/g, '').split('T')[0] + "T235959Z";
        }

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:${c.id}@edwk.com\n`;
        icsContent += `DTSTAMP:${timestamp}\n`;
        icsContent += `SUMMARY:${c.classNameStr} (${c.typeStr})\n`;
        icsContent += `DESCRIPTION:Professeur: ${c.tutorStr || 'Non assigné'}\n`;
        icsContent += `DTSTART;TZID=Europe/Paris:20240101T${startH}${startM}00\n`;
        icsContent += `DTEND;TZID=Europe/Paris:20240101T${endH}${endM}00\n`;
        icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}${untilStr ? ';UNTIL=' + untilStr : ''}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Mon_Planning_${data.studentName.replace(' ', '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const checkConflict = (course: any, list: any[]) => {
    const s = timeToMin(course.startTime); const e = timeToMin(course.endTime);
    return list.some(o => o.id !== course.id && s < timeToMin(o.endTime) && e > timeToMin(o.startTime));
  };

  // 🔥 CARTE DE COURS (Tailles de polices identiques)
  const EventCard = ({ course, isConflicting, idx, isWeekView }: any) => {
    const top = ((timeToMin(course.startTime) - (START_HOUR * 60)) / (TOTAL_HOURS * 60)) * 100;
    const h = ((timeToMin(course.endTime) - timeToMin(course.startTime)) / (TOTAL_HOURS * 60)) * 100;
    const colorClasses = isConflicting ? "bg-[#FFF0F0] border-[#EB5757] text-[#EB5757] ring-1 ring-[#EB5757]" : (COLORS[course.typeStr] || COLORS["Default"]);
    
    return (
      <div 
        className={`absolute rounded-md border-l-[3px] shadow-sm flex flex-col p-1.5 ${colorClasses}`} 
        style={{ top: `${top}%`, height: `${h}%`, left: isConflicting && idx % 2 !== 0 ? (isWeekView ? "15%" : "20%") : "0", width: isConflicting ? (isWeekView ? "85%" : "80%") : "100%", zIndex: 20 }}
      >
        {/* 1. Nom de la classe */}
        <h3 className={`font-bold ${isWeekView ? 'text-[11px]' : 'text-[12px]'} leading-tight truncate`}>
          {isConflicting && "⚠️ "}{course.classNameStr}
        </h3>
        
        {/* 2. Type (Course / Communication) */}
        {!isWeekView && (
          <div className="text-[11px] font-medium opacity-80 truncate mt-[2px]">
            {course.typeStr}
          </div>
        )}

        {/* 3. Nom de l'enseignant (Même taille, en bas) */}
        {course.tutorStr && course.tutorStr !== "Non assigné" && (
          <div className="text-[11px] font-medium opacity-80 truncate flex items-center gap-1 mt-auto">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {course.tutorStr}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-[#37352f] overflow-hidden select-none relative">
      <header className="flex-none bg-white border-b border-gray-100 pt-safe z-40 relative">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsFilterOpen(true)} className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
            <button onClick={() => { setMiniCalBaseDate(new Date(selectedDate)); setIsCalendarOpen(!isCalendarOpen); setIsViewMenuOpen(false); }} className="text-[18px] font-bold tracking-tight text-gray-900 capitalize flex items-center gap-1.5">{selectedDate.toLocaleDateString('fr-FR', { month: 'long' })}<ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCalendarOpen ? 'rotate-90' : ''}`} /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => {setIsViewMenuOpen(!isViewMenuOpen); setIsCalendarOpen(false);}} className="text-[13px] font-semibold bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 flex items-center gap-1 shadow-sm transition-all">{viewMode} <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isViewMenuOpen ? 'rotate-90' : ''}`} /></button>
              {isViewMenuOpen && <> <div className="fixed inset-0 z-40" onClick={() => setIsViewMenuOpen(false)}></div> <div className="absolute top-full mt-2 right-0 w-36 bg-white rounded-lg shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in zoom-in-95"><MenuItem label="Jour" isSelected={viewMode === 'Jour'} onClick={() => { setViewMode('Jour'); setIsViewMenuOpen(false); }} /><MenuItem label="Semaine" isSelected={viewMode === 'Semaine'} onClick={() => { setViewMode('Semaine'); setIsViewMenuOpen(false); }} /></div></>}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0077D4] flex items-center justify-center font-bold text-[12px] border border-blue-100">{data.studentName.substring(0, 2).toUpperCase()}</div>
          </div>
        </div>

        {isCalendarOpen && (
          <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-2xl px-5 py-4 animate-in slide-in-from-top-2 z-50">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[14px] font-bold text-gray-800 capitalize">{miniCalBaseDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-2">
                <button onClick={() => { const d = new Date(miniCalBaseDate); d.setMonth(d.getMonth()-1); setMiniCalBaseDate(d); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <button onClick={() => { const d = new Date(miniCalBaseDate); d.setMonth(d.getMonth()+1); setMiniCalBaseDate(d); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest"><span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span></div>
            <div className="grid grid-cols-7 text-center text-[13px] gap-y-1">
              {generateMiniCalendar(miniCalBaseDate, currentTime).map((day, i) => (
                <button key={i} onClick={() => { setSelectedDate(day.dateObj); setIsCalendarOpen(false); }} className={`w-8 h-8 flex items-center justify-center rounded-full mx-auto transition-colors ${day.isToday ? "bg-red-500 text-white font-bold" : day.dateObj.toDateString() === selectedDate.toDateString() ? "bg-gray-900 text-white font-bold" : day.isCurrentMonth ? "text-gray-800 hover:bg-gray-100" : "text-gray-300"}`}>{day.num}</button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'Jour' && (
          <div className="px-2 pb-2 pt-1 border-t border-gray-50">
            <div className="flex justify-between items-center text-center">
              {weekDays.map((date, i) => (
                <div key={i} onClick={() => setSelectedDate(date)} className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-all active:scale-95">
                  <span className={`text-[10px] uppercase font-semibold mb-1 tracking-widest ${date.toDateString() === selectedDate.toDateString() ? 'text-gray-900' : 'text-gray-400'}`}>{date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0)}</span>
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full text-[15px] font-bold transition-all ${date.toDateString() === new Date().toDateString() ? "bg-red-500 text-white shadow-sm" : date.toDateString() === selectedDate.toDateString() ? "bg-[#37352f] text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"}`}>{date.getDate()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto bg-white relative z-10 custom-scrollbar" ref={timelineRef}>
        <div className={`relative ${viewMode === 'Semaine' ? 'min-w-[850px]' : 'w-full'}`} style={{ height: `${TIMELINE_HEIGHT}px` }}>
          {viewMode === 'Semaine' && (
            <div className="sticky top-0 z-30 flex h-12 bg-white/95 backdrop-blur-md border-b border-gray-100 ml-[60px]">
              {weekDays.map((date, i) => (
                <div key={i} className="flex-1 text-center flex flex-col justify-center border-r border-gray-50 last:border-0">
                  <span className={`text-[10px] uppercase font-semibold mb-0.5 ${date.toDateString() === currentTime.toDateString() ? "text-red-500" : "text-gray-400"}`}>{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                  <span className={`text-[14px] font-bold ${date.toDateString() === currentTime.toDateString() ? "text-red-500" : "text-gray-800"}`}>{date.getDate()}</span>
                </div>
              ))}
            </div>
          )}

          {HOURS.map(h => (
            <div key={h} className="absolute flex w-full border-t border-gray-50" style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }}>
              <div className="w-[60px] flex-none relative sticky left-0 bg-white/95 z-20"><span className="absolute right-3 text-[11px] font-medium text-gray-400 -translate-y-1/2 px-1">{formatNotionHour(h)}</span></div>
            </div>
          ))}

          <div className={`${viewMode === 'Semaine' ? 'absolute top-0 bottom-0 left-[60px] right-0 flex' : 'absolute top-0 bottom-0 left-[60px] right-4'}`}>
            {viewMode === 'Jour' ? dailySchedules.map((c: any, idx: number) => (
              <EventCard key={c.id} course={c} isConflicting={checkConflict(c, dailySchedules)} idx={idx} isWeekView={false} />
            )) : weekDays.map((date, index) => {
              const dayScheds = filteredSchedules.filter((c: any) => (API_TO_FRENCH_DAYS[c.day] || c.day) === DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]);
              return (
                <div key={index} className={`flex-1 relative border-r border-gray-50 last:border-0 ${date.toDateString() === currentTime.toDateString() ? 'bg-red-50/20' : ''}`}>
                  {dayScheds.map((c: any, idx: number) => <EventCard key={c.id} course={c} isConflicting={checkConflict(c, dayScheds)} idx={idx} isWeekView={true} />)}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* FILTRES SLIDE-OVER */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in" onClick={() => setIsFilterOpen(false)}></div>
          <div className="relative w-[85%] max-w-[320px] h-full bg-[#FBFBFB] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="h-14 border-b border-gray-200 flex items-center justify-between px-5 bg-white flex-none">
              <span className="flex items-center gap-2 text-[#37352f] font-bold text-[16px]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>Filtres</span>
              <button onClick={() => setIsFilterOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="mb-6">
                <button onClick={() => setIsClassesMenuOpen(!isClassesMenuOpen)} className="flex items-center gap-2 w-full py-1 text-[12px] font-bold text-[#91918e] uppercase tracking-wider hover:text-gray-700 transition-colors">
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isClassesMenuOpen ? 'rotate-90' : ''}`} />
                  Mes Classes ({uniqueClasses.length})
                </button>
                
                {isClassesMenuOpen && <div className="mt-2 flex flex-col animate-in fade-in">
                  {uniqueClasses.map((cls, i) => {
                    const isChecked = selectedClasses.includes(cls);
                    const dot = DOT_COLORS[i % DOT_COLORS.length];
                    
                    // 🔥 RECHERCHE GARANTIE DANS CLEANED SCHEDULES
                    const classSchedules = cleanedSchedules.filter((s: any) => s.classNameStr === cls);
                    const matchExam = classSchedules.find((s: any) => {
                        const val = s.examDateStr;
                        return val && val !== "null" && val !== "À définir" && val !== "";
                    });
                    const matchEnd = classSchedules.find((s: any) => {
                        const val = s.endDateStr;
                        return val && val !== "null" && val !== "À définir" && val !== "";
                    });
                    
                    return (
                      <div key={cls} className="flex flex-col mb-1">
                        <label className="flex items-center gap-3 p-2 hover:bg-[#efefed] rounded-lg cursor-pointer transition-colors">
                          <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dot.hex : 'white', borderColor: isChecked ? dot.hex : '#d1d5db' }}>
                            {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleClass(cls)} />
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dot.hex }}></span>
                          <span className={`text-[14px] truncate flex-1 ${isChecked ? 'font-bold text-[#37352f]' : 'text-gray-700'}`}>{cls}</span>
                        </label>
                        
                        {/* 📊 CASCADE DETAILS */}
                        {isChecked && (
                          <div className="ml-[34px] mr-2 py-1 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200 border-l border-gray-200 pl-3 mb-2">
                            <div className="flex items-center justify-between text-[13px] group/stat hover:bg-[#efefed] px-2 py-1.5 rounded transition-colors cursor-default">
                                <div className="flex items-center gap-2 text-[#91918e] font-medium">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    Examen
                                </div>
                                <span className="font-medium text-[#37352f]">{formatDate(matchExam?.examDateStr)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px] group/stat hover:bg-[#efefed] px-2 py-1.5 rounded transition-colors cursor-default">
                                <div className="flex items-center gap-2 text-[#91918e] font-medium">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    Fin session
                                </div>
                                <span className="font-medium text-[#37352f]">{formatDate(matchEnd?.endDateStr)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>}
              </div>

              <div className="mb-4 border-t border-gray-100 pt-5">
                <button onClick={() => setIsTypesMenuOpen(!isTypesMenuOpen)} className="flex items-center gap-2 w-full py-1 text-[12px] font-bold text-[#91918e] uppercase tracking-wider">
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isTypesMenuOpen ? 'rotate-90' : ''}`} />
                  Types de session
                </button>
                {isTypesMenuOpen && <div className="mt-2 flex flex-col space-y-1 animate-in fade-in">
                  {uniqueTypes.map((type) => (
                    <label key={type} className="flex items-center gap-3 p-2 hover:bg-[#efefed] rounded-lg cursor-pointer transition-colors">
                      <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: selectedTypes.includes(type) ? '#37352f' : 'white', borderColor: selectedTypes.includes(type) ? '#37352f' : '#d1d5db' }}>
                        {selectedTypes.includes(type) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
                      <span className={`text-[14px] ${selectedTypes.includes(type) ? 'font-bold text-[#37352f]' : 'text-gray-700'}`}>{type}</span>
                    </label>
                  ))}
                </div>}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-1">
                <button 
                  onClick={exportToICal} 
                  className="w-full py-2 bg-white border border-[#d1d5db] hover:bg-[#efefed] text-[#37352f] text-[13px] font-semibold rounded-[4px] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Exporter (.ics)
                </button>
                
                {(selectedClasses.length > 0 || selectedTypes.length > 0) && (
                    <button 
                      onClick={() => { setSelectedClasses([]); setSelectedTypes([]); setIsFilterOpen(false); }} 
                      className="w-full py-1.5 mt-1 bg-transparent hover:bg-[#efefed] text-[#91918e] hover:text-[#37352f] text-[13px] font-medium rounded transition-colors text-center"
                    >
                        Réinitialiser les filtres
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}