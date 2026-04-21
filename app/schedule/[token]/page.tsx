"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";

// ⚠️ L'URL DE L'API PROFESSEUR (Celle qui lit le token)
const API_URL = "https://ahmedelhaddedwk--95e089743a3611f1b31342b51c65c3df.web.val.run/";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const EN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

// 🔥 Nouvelle couleur Jaune Moutarde pour les Examens
const COLORS: Record<string, string> = {
  "Course": "bg-[#E5F3FF] border-[#0077D4] text-[#004A87]",
  "Communication": "bg-[#EAF5E9] border-[#2E7D32] text-[#1B5E20]",
  "Exam": "bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]", 
  "Default": "bg-[#F3E8FF] border-[#7E22CE] text-[#4C1D95]",
};

const API_TO_FRENCH_DAYS: Record<string, string> = {
  "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
  "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche"
};

const API_TO_INDEX: Record<string, number> = {
  "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6
};

const getFrenchDayName = (d: Date) => DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];

// 🔥 Parsing de date sécurisé
function parseDateSafely(dateStr: string) {
    if (!dateStr) return new Date();
    try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            return new Date(y, m - 1, d);
        }
    } catch(e) {}
    return new Date(dateStr);
}

function getPositionStyles(startTime: string, endTime: string) {
  if (!startTime || !endTime) return { top: "0%", height: "0%" };
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startInHours = startH + startM / 60;
  const endInHours = endH + endM / 60;
  const top = ((startInHours - START_HOUR) / TOTAL_HOURS) * 100; 
  const height = ((endInHours - startInHours) / TOTAL_HOURS) * 100;
  return { top: `${top}%`, height: `${height}%` };
}

function formatNotionHour(hour: number) {
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function formatExactTime(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${hours}:${minutes} ${ampm}`;
}

function formatMonthTime(timeStr: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}${m !== 0 ? ':' + m.toString().padStart(2, '0') : ''} ${ampm}`;
}

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// 🔥 Logique de filtrage SÉPARÉE
function isCourseActiveOnDate(course: any, renderedDate: Date) {
  const d = new Date(renderedDate);
  d.setHours(0, 0, 0, 0);
  
  // Les examens s'affichent uniquement le jour exact de l'examen
  if (course.isExam && course.examDate) {
      const ex = new Date(course.examDate);
      ex.setHours(0, 0, 0, 0);
      return d.getTime() === ex.getTime();
  }

  // Si le cours a une date de fin, on le cache une fois cette date dépassée
  if (course.endDate) {
      const e = parseDateSafely(course.endDate);
      e.setHours(0, 0, 0, 0);
      if (d.getTime() > e.getTime()) {
          return false;
      }
  }

  // Si le cours a une date de début, on le cache avant cette date
  if (course.startDate) {
      const s = parseDateSafely(course.startDate);
      s.setHours(0, 0, 0, 0);
      if (d.getTime() < s.getTime()) {
          return false;
      }
  }

  return true;
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

const ChevronDown = () => (
    <svg viewBox="0 0 100 100" className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20,35 50,65 80,35" />
    </svg>
);

const MenuItem = ({ label, shortcut, isSelected, onClick, hasSubmenu, isExpanded }: any) => (
    <div 
        onClick={onClick} 
        className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-[#37352f] transition-colors"
    >
        <div className="flex items-center gap-2">
            <div className="w-4 flex justify-center text-gray-800">
                {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <span className="text-[13px]">{label}</span>
        </div>
        <div className="flex items-center gap-3">
            {shortcut && <span className="text-gray-400 text-[11px] font-semibold tracking-wide">{shortcut}</span>}
            {hasSubmenu && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
            {isExpanded && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>}
        </div>
    </div>
);

export default function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isApercuOpen, setIsApercuOpen] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [miniCalBaseDate, setMiniCalBaseDate] = useState<Date>(new Date());

  const [viewMode, setViewMode] = useState('Semaine');
  const [offset, setOffset] = useState(0);
  
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [numDaysExpanded, setNumDaysExpanded] = useState(false);

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

  let daysLength = 7;
  if (viewMode === 'Jour' || viewMode === "Aujourd'hui") daysLength = 1;
  else if (viewMode.includes('jours')) daysLength = parseInt(viewMode.split(' ')[0]);

  const displayDate = new Date(currentTime);
  if (viewMode === 'Semaine') {
      displayDate.setDate(currentTime.getDate() + (offset * 7));
      const day = displayDate.getDay() === 0 ? 6 : displayDate.getDay() - 1;
      displayDate.setDate(displayDate.getDate() - day);
  } else if (viewMode === 'Mois') {
      displayDate.setDate(1); 
      displayDate.setMonth(currentTime.getMonth() + offset);
  } else {
      displayDate.setDate(currentTime.getDate() + (offset * daysLength));
  }

  useEffect(() => {
    setMiniCalBaseDate(new Date(displayDate.getFullYear(), displayDate.getMonth(), 1));
  }, [displayDate.getFullYear(), displayDate.getMonth()]);

  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-gray-400 italic">Chargement du planning Professeur...</div>;
  if (!data || !data.schedules) return notFound();

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const rawSchedules = data.schedules || [];
  let baseSchedules = rawSchedules.map((c: any) => ({ ...c }));

  // 🔥 GÉNÉRATION DE L'EXAMEN EXACTEMENT SELON LA DATE DE BASEROW
  const classGroups: Record<string, any[]> = {};
  baseSchedules.forEach(c => {
      if (!classGroups[c.className]) classGroups[c.className] = [];
      classGroups[c.className].push(c);
  });

  const examSchedules: any[] = [];
  Object.keys(classGroups).forEach(className => {
      const classScheds = classGroups[className];
      if (classScheds.length === 0) return;

      // 1. On trouve la première session pour copier ses horaires
      classScheds.sort((a, b) => {
          const dayA = API_TO_INDEX[a.day] ?? 99;
          const dayB = API_TO_INDEX[b.day] ?? 99;
          if (dayA !== dayB) return dayA - dayB;
          return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });
      const firstSession = classScheds[0];

      // 2. On cherche la date d'examen dans n'importe laquelle des sessions de cette classe
      let examField = null;
      for (const sched of classScheds) {
          examField = sched.examDate || sched.ExamDate || sched.exam_date || sched.dateExam || sched.exam;
          if (examField) break;
      }

      // 3. Si on a trouvé une date d'examen dans Baserow, on crée le bloc
      if (examField) {
          const examDateObj = parseDateSafely(examField);
          
          // CRITIQUE : Calculer le jour exact en anglais ("Monday", "Tuesday"...) pour qu'il s'affiche dans la bonne colonne de la semaine
          const dayIndex = examDateObj.getDay() === 0 ? 6 : examDateObj.getDay() - 1;
          const correctDayStr = EN_DAYS[dayIndex];

          examSchedules.push({
              ...firstSession,
              id: firstSession.id + "_exam",
              type: "Exam",
              isExam: true,
              examDate: examDateObj,
              day: correctDayStr, // On force le jour de la semaine pour qu'il corresponde à la date de l'examen
              startTime: firstSession.startTime, // Copie exacte des heures de la première session
              endTime: firstSession.endTime
          });
      }
  });

  // 🔥 On conserve simplement tous les schedules, les conflits seront calculés localement !
  const schedules = [...baseSchedules, ...examSchedules];

  const uniqueClassesCount = new Set(schedules.map((c: any) => c.className)).size;
  const totalSessions = schedules.filter(c => !c.isExam).length;
  let totalHours = 0;
  schedules.filter(c => !c.isExam).forEach((c: any) => {
    if (c.startTime && c.endTime) {
      const [sH, sM] = c.startTime.split(':').map(Number);
      const [eH, eM] = c.endTime.split(':').map(Number);
      totalHours += (eH + eM / 60) - (sH + sM / 60);
    }
  });

  const currentHour = currentTime.getHours();
  const showTimeLine = currentHour >= START_HOUR && currentHour < END_HOUR;
  const timeLineTop = ((currentHour + currentTime.getMinutes() / 60 - START_HOUR) / TOTAL_HOURS) * 100;

  const activeDates = Array.from({ length: daysLength }).map((_, i) => {
      const d = new Date(displayDate);
      d.setDate(displayDate.getDate() + i);
      return d;
  });

  const monthDays = viewMode === 'Mois' ? generateMiniCalendar(displayDate, currentTime) : [];

  const handleMiniCalPrevMonth = () => {
    const newDate = new Date(miniCalBaseDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setMiniCalBaseDate(newDate);
  };

  const handleMiniCalNextMonth = () => {
    const newDate = new Date(miniCalBaseDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setMiniCalBaseDate(newDate);
  };

  const handleMiniCalDateClick = (clickedDate: Date) => {
    const target = new Date(clickedDate);
    target.setHours(0, 0, 0, 0);

    const current = new Date(currentTime);
    current.setHours(0, 0, 0, 0);

    if (viewMode === 'Mois') {
        const diffMonths = (target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth());
        setOffset(diffMonths);
    } else if (viewMode === 'Jour') {
        const diffTime = target.getTime() - current.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        setOffset(diffDays);
    } else if (viewMode === 'Semaine') {
        const targetMonday = new Date(target);
        const targetDay = targetMonday.getDay() === 0 ? 6 : targetMonday.getDay() - 1;
        targetMonday.setDate(targetMonday.getDate() - targetDay);

        const currentMonday = new Date(current);
        const currentDay = currentMonday.getDay() === 0 ? 6 : currentMonday.getDay() - 1;
        currentMonday.setDate(currentMonday.getDate() - currentDay);

        const diffTime = targetMonday.getTime() - currentMonday.getTime();
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
        setOffset(diffWeeks);
    } else {
        const diffTime = target.getTime() - current.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        setOffset(Math.floor(diffDays / daysLength));
    }
  };

  const currentViewLabel = viewMode === 'Jour' && offset === 0 ? "Aujourd'hui" : viewMode;

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden relative">
      
      {/* SIDEBAR PROFESSEUR */}
      <aside className={`flex flex-col border-r border-gray-200 bg-[#FBFBFB] transition-all duration-300 ${isSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden border-none'}`}>
        <div className="h-16 flex items-center px-5 border-b border-gray-200 bg-white min-w-[260px]">
           <div className="flex items-center gap-3 w-full p-1.5 -ml-1.5">
            <div className="w-8 h-8 rounded-full bg-[#E5F3FF] text-[#0077D4] flex items-center justify-center font-bold text-[13px] border border-[#0077D4]/20 shadow-sm flex-none">
              {getInitials(data.tutor.name)}
            </div>
            <span className="font-semibold text-sm truncate text-gray-800">{data.tutor.name}</span>
          </div>
        </div>

        <div className="py-5 flex-1 overflow-y-auto min-w-[260px] custom-scrollbar">
            <div className="mb-6 px-4">
                <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-[13px] font-bold text-gray-800 capitalize tracking-tight">
                        {miniCalBaseDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={handleMiniCalPrevMonth} className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button onClick={handleMiniCalNextMonth} className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-tighter">
                    <span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span>
                </div>
                
                <div className="grid grid-cols-7 text-center text-[12px] gap-y-0.5">
                    {generateMiniCalendar(miniCalBaseDate, currentTime).map((day, i) => {
                        const isSelectedWeek = activeDates.some(wd => wd.toDateString() === day.dateObj.toDateString());
                        return (
                            <button 
                                key={i} 
                                onClick={() => handleMiniCalDateClick(day.dateObj)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto transition-colors
                                    ${day.isToday ? "bg-[#EB5757] text-white font-bold shadow-sm" 
                                    : isSelectedWeek && viewMode !== 'Mois' ? "bg-[#E5F3FF] text-[#0077D4] font-bold" 
                                    : day.isCurrentMonth ? "text-gray-700 hover:bg-gray-200 font-medium" 
                                    : "text-gray-300 hover:bg-gray-100"}`}
                            >
                                {day.num}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mx-5 mb-4 border-t border-gray-200"></div>

            <div className="px-3">
                <button 
                  onClick={() => setIsApercuOpen(!isApercuOpen)}
                  className="flex items-center gap-2 px-2 py-1 w-full text-[12px] font-semibold text-gray-500 hover:bg-gray-100 rounded transition-colors group"
                >
                    <span className={`transition-transform duration-200 ${isApercuOpen ? '' : '-rotate-90'}`}>
                      <ChevronDown />
                    </span>
                    Aperçu de mes classes
                </button>

                {isApercuOpen && (
                  <div className="mt-1 space-y-0.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-200/50 cursor-default">
                          <div className="flex items-center gap-2.5"><span>👥</span> Classes actives</div>
                          <span className="text-gray-400 text-xs font-bold">{uniqueClassesCount}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-200/50 cursor-default">
                          <div className="flex items-center gap-2.5"><span>📅</span> Séances / sem.</div>
                          <span className="text-gray-400 text-xs font-bold">{totalSessions}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] text-gray-700 hover:bg-gray-200/50 cursor-default">
                          <div className="flex items-center gap-2.5"><span>⏱️</span> Heures / sem.</div>
                          <span className="text-gray-400 text-xs font-bold">{totalHours.toFixed(1)}h</span>
                      </div>
                  </div>
                )}
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 flex-none bg-white">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <h2 className="text-xl font-bold text-gray-800 capitalize">
                    {displayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
            </div>
            
            <div className="flex gap-2 text-[13px] font-medium items-center">
                
                {/* 🔥 SÉLECTEUR DE VUE STYLE NOTION (Unique) */}
                <div className="relative ml-1">
                    <button 
                        onClick={() => setViewMenuOpen(!viewMenuOpen)}
                        className="flex items-center gap-2 text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        {currentViewLabel}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    
                    {viewMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => {setViewMenuOpen(false); setNumDaysExpanded(false);}}></div>
                            <div className="absolute top-full mt-2 left-0 md:right-0 md:left-auto w-56 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 z-50 font-sans text-[13px] animate-in fade-in zoom-in-95 duration-100">
                                <MenuItem label="Aujourd'hui" shortcut="T" isSelected={viewMode === 'Jour' && offset === 0} onClick={() => {setViewMode('Jour'); setOffset(0); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                <MenuItem label="Semaine" shortcut="W" isSelected={viewMode === 'Semaine'} onClick={() => {setViewMode('Semaine'); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                <MenuItem label="Mois" shortcut="M" isSelected={viewMode === 'Mois'} onClick={() => {setViewMode('Mois'); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                
                                <div className="h-px bg-gray-200 my-1 mx-3"></div>
                                
                                <MenuItem 
                                    label="Nombre de jours" 
                                    hasSubmenu={!numDaysExpanded} 
                                    isExpanded={numDaysExpanded}
                                    isSelected={viewMode.includes('jours')} 
                                    onClick={() => setNumDaysExpanded(!numDaysExpanded)} 
                                />
                                
                                {numDaysExpanded && (
                                    <div className="bg-gray-50/50 py-1 border-y border-gray-100 mt-1 animate-in slide-in-from-top-1 duration-150">
                                        {[2,3,4,5,6,7].map(n => (
                                            <div 
                                                key={n}
                                                onClick={() => {setViewMode(`${n} jours`); setOffset(0); setViewMenuOpen(false); setNumDaysExpanded(false);}}
                                                className="flex items-center justify-between px-8 py-1.5 hover:bg-gray-100 cursor-pointer text-[13px] text-gray-600 transition-colors"
                                            >
                                                <span>{n} jours</span>
                                                {viewMode === `${n} jours` && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center text-gray-700 bg-white rounded border border-gray-200 overflow-hidden shadow-sm ml-2">
                    <button onClick={() => setOffset(p => p - 1)} className="px-2 py-1.5 hover:bg-gray-100 border-r border-gray-200 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button onClick={() => setOffset(p => p + 1)} className="px-2 py-1.5 hover:bg-gray-100 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            </div>
        </header>

        <div className="flex flex-1 overflow-auto">
            {viewMode === 'Mois' ? (
                // --- VUE MENSUELLE (Grille Mois) ---
                <div className="flex flex-col min-w-[800px] w-full bg-white h-full">
                    <div className="grid grid-cols-7 border-b border-gray-200 flex-none bg-white">
                        {DAYS.map(day => (
                            <div key={day} className="py-2 text-center text-[12px] font-medium text-[#91918e] capitalize tracking-wide">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l border-gray-200">
                        {monthDays.map((day, i) => {
                            const dayName = getFrenchDayName(day.dateObj);
                            
                            const daySchedules = schedules
                                .filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName && isCourseActiveOnDate(c, day.dateObj))
                                .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                            // 🔥 Calcul des conflits de manière locale (Mois)
                            daySchedules.forEach((course: any) => {
                                const start = timeToMinutes(course.startTime);
                                const end = timeToMinutes(course.endTime);
                                course.isConflicting = daySchedules.some((other: any) => {
                                    if (other.id === course.id) return false;
                                    const otherStart = timeToMinutes(other.startTime);
                                    const otherEnd = timeToMinutes(other.endTime);
                                    return start < otherEnd && end > otherStart;
                                });
                            });

                            return (
                                <div key={i} className={`border-b border-r border-gray-200 p-1 flex flex-col gap-0.5 overflow-hidden ${!day.isCurrentMonth ? 'bg-gray-50/40' : 'bg-white'}`}>
                                    <div className="flex justify-end px-1 mt-0.5 mb-1">
                                        <span className={`text-[12px] font-medium px-1.5 min-w-[24px] h-6 flex items-center justify-center rounded-full ${day.isToday ? 'bg-[#EB5757] text-white' : (day.isCurrentMonth ? 'text-[#37352f]' : 'text-gray-400')}`}>
                                            {day.num === 1 ? <span className="capitalize">{day.dateObj.toLocaleDateString('fr-FR', { month: 'short' })} {day.num}</span> : day.num}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-[1px] overflow-y-auto custom-scrollbar flex-1 px-0.5 pb-1">
                                        {daySchedules.map((course: any) => {
                                            const colorClass = COLORS[course.type] || COLORS["Default"];
                                            const hexMatch = colorClass.match(/text-\[([^\]]+)\]/);
                                            const hexColor = hexMatch ? hexMatch[1] : "#91918e";
                                            
                                            return (
                                                <div 
                                                    key={course.id} 
                                                    onClick={() => setSelectedCourse(course)}
                                                    className="group text-[11px] px-1 py-[2px] rounded-[4px] cursor-pointer transition-colors hover:bg-gray-100 flex items-center gap-1.5"
                                                >
                                                    <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: hexColor }}></div>
                                                    {course.isConflicting && !course.isExam && <span className="text-[10px] shrink-0">⚠️</span>}
                                                    <span className="font-semibold shrink-0" style={{ color: hexColor, opacity: 0.85 }}>
                                                        {formatMonthTime(course.startTime)}
                                                    </span>
                                                    <span className="font-semibold text-[#37352f] truncate">
                                                        {course.className} {course.isExam && "— Examen"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                // --- VUE TIMELINE (Jour / Semaine) ---
                <div className="min-w-[800px] flex w-full relative">
                    <div className="w-16 flex-none border-r border-gray-200 relative bg-white z-20 flex flex-col">
                        <div className="h-14 border-b border-gray-200"></div>
                        <div className="relative flex-1 min-h-[800px]">
                            {HOURS.map(h => (
                                <div 
                                    key={h} 
                                    className="absolute w-full text-right pr-2 text-[10px] font-medium text-gray-400 -translate-y-1/2" 
                                    style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }}
                                >
                                    {formatNotionHour(h)}
                                </div>
                            ))}
                            {showTimeLine && offset === 0 && (viewMode === 'Semaine' || viewMode === 'Jour' || viewMode === "Aujourd'hui") && (
                                <div className="absolute w-full text-right pr-1 -translate-y-1/2 z-30" style={{ top: `${timeLineTop}%` }}>
                                    <span className="bg-[#EB5757] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        {formatExactTime(currentTime)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-auto flex flex-col relative">
                        <div className="flex h-14 border-b border-gray-200 bg-white sticky top-0 z-10">
                            {activeDates.map((date, index) => {
                                const dayName = getFrenchDayName(date);
                                const isActualToday = date.toDateString() === currentTime.toDateString();
                                
                                return (
                                    <div 
                                        key={index} 
                                        className={`flex-1 text-center flex flex-col items-center justify-center border-r border-gray-100 last:border-r-0 transition-colors ${isActualToday ? "bg-[#FFF0F0]/10" : ""}`}
                                    >
                                        <span className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isActualToday ? "text-[#EB5757]" : "text-gray-400"}`}>
                                            {dayName}
                                        </span>
                                        <div className={`text-[15px] font-medium leading-none flex items-center justify-center ${isActualToday ? "text-white bg-[#EB5757] rounded-full w-6 h-6 shadow-sm" : "text-gray-700 w-6 h-6"}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex-1 relative h-full min-h-[800px]">
                            {HOURS.map(h => (
                                <div 
                                    key={h} 
                                    className="absolute w-full border-b border-gray-50" 
                                    style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} 
                                />
                            ))}
                            
                            {showTimeLine && offset === 0 && (viewMode === 'Semaine' || viewMode === 'Jour' || viewMode === "Aujourd'hui") && (
                                <div 
                                    className="absolute w-full border-b border-[#EB5757] z-10 opacity-50" 
                                    style={{ top: `${timeLineTop}%` }} 
                                />
                            )}

                            <div className="absolute inset-0 flex">
                                {activeDates.map((date, index) => {
                                    const dayName = getFrenchDayName(date);
                                    const isActualToday = date.toDateString() === currentTime.toDateString();
                                    
                                    const dailyCourses = schedules
                                        .filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName && isCourseActiveOnDate(c, date))
                                        .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                                    
                                    const columns: any[][] = [];
                                    dailyCourses.forEach((course: any) => {
                                        const start = timeToMinutes(course.startTime);
                                        const end = timeToMinutes(course.endTime);

                                        // 🔥 Calcul des conflits de manière locale (Jour/Semaine)
                                        course.isConflicting = dailyCourses.some((other: any) => {
                                            if (other.id === course.id) return false;
                                            const otherStart = timeToMinutes(other.startTime);
                                            const otherEnd = timeToMinutes(other.endTime);
                                            return start < otherEnd && end > otherStart;
                                        });

                                        let placed = false;
                                        for (let i = 0; i < columns.length; i++) {
                                            const lastEvent = columns[i][columns[i].length - 1];
                                            if (timeToMinutes(lastEvent.endTime) <= start) {
                                                columns[i].push(course);
                                                course.columnIndex = i;
                                                placed = true;
                                                break;
                                            }
                                        }
                                        if (!placed) {
                                            course.columnIndex = columns.length;
                                            columns.push([course]);
                                        }
                                    });
                                    const numColumns = columns.length || 1;

                                    return (
                                        <div key={index} className={`flex-1 border-r border-gray-100 last:border-r-0 relative ${isActualToday ? "bg-[#FFF0F0]/20" : ""}`}>
                                            {isActualToday && showTimeLine && offset === 0 && (viewMode === 'Semaine' || viewMode === 'Jour' || viewMode === "Aujourd'hui") && (
                                                <div className="absolute w-2 h-2 rounded-full bg-[#EB5757] z-20 -ml-1" style={{ top: `calc(${timeLineTop}% - 4px)` }} />
                                            )}
                                            
                                            {dailyCourses.map((course: any) => {
                                                const widthPct = 100 / numColumns;
                                                const leftPct = (course.columnIndex || 0) * widthPct;
                                                const pos = getPositionStyles(course.startTime, course.endTime);

                                                return (
                                                    <div 
                                                        key={course.id} 
                                                        onClick={() => setSelectedCourse(course)}
                                                        style={{ ...pos, left: `${leftPct}%`, width: `calc(${widthPct}% - 2px)` }} 
                                                        className={`absolute p-2 rounded-md border-l-[4px] text-[11px] overflow-hidden shadow-sm z-20 cursor-pointer transition-transform hover:scale-[1.02] flex flex-col ${
                                                            course.isConflicting && !course.isExam
                                                                ? "bg-[#FFF0F0] border-[#EB5757] text-[#EB5757] ring-1 ring-[#EB5757]" 
                                                                : (COLORS[course.type] || COLORS["Default"])
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-[12px] truncate leading-tight mb-0.5 flex items-center gap-1">
                                                            {course.isConflicting && !course.isExam && <span title="Conflit d'horaire">⚠️</span>}
                                                            {course.className}
                                                        </div>
                                                        <div className="opacity-90 font-medium text-[11px] truncate">
                                                            {course.startTime} - {course.endTime} {course.isExam && "• Examen"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* --- SIDE PEEK (MODALE PROFESSEUR) --- */}
      {selectedCourse && (
        <>
            <div 
                className="fixed inset-0 bg-black/20 z-[60] transition-opacity"
                onClick={() => setSelectedCourse(null)}
            />
            <div className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[70] transform transition-transform animate-in slide-in-from-right duration-300 border-l border-[#e5e5e5] flex flex-col font-sans">
                
                <div className="h-12 flex items-center justify-between px-3 shrink-0 border-b border-[#e5e5e5]">
                    <button onClick={() => setSelectedCourse(null)} className="p-1.5 hover:bg-[#efefed] rounded text-[#91918e] transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    {selectedCourse.isConflicting && !selectedCourse.isExam && (
                        <div className="text-[12px] font-medium text-[#EB5757] flex items-center gap-1.5 bg-[#FFF0F0] px-3 py-1 rounded-full border border-[#EB5757]/20">
                            ⚠️ Conflit d'horaire détecté
                        </div>
                    )}
                </div>

                <div className="px-10 pb-10 flex-1 overflow-y-auto custom-scrollbar">
                    
                    <h3 className="text-[32px] font-bold text-[#37352f] mb-6 mt-4 leading-tight flex items-center gap-3">
                        📄 {selectedCourse.className} {selectedCourse.isExam && "(Examen)"}
                    </h3>

                    {selectedCourse.isConflicting && !selectedCourse.isExam && (
                      <div className="mb-6 bg-[#fffbe6] border border-[#e6c170] rounded-lg p-4 flex gap-3 text-[#7d6023] animate-in fade-in duration-300">
                        <span className="text-2xl mt-0.5">⚠️</span>
                        <div>
                          <p className="font-semibold text-[14px]">Attention : Conflit d'horaire détecté</p>
                          <p className="text-[13px] mt-0.5 opacity-90">Cette séance chevauche une autre séance sur ce même créneau horaire.</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2 mb-8">
                        <div className="flex items-center min-h-[34px] text-[14px]">
                            <div className="w-[160px] text-[#91918e] flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Horaire
                            </div>
                            <div className={`text-[#37352f] ${selectedCourse.isConflicting && !selectedCourse.isExam ? "text-[#EB5757] font-bold" : ""}`}>
                                {selectedCourse.startTime} — {selectedCourse.endTime}
                            </div>
                        </div>

                        <div className="flex items-center min-h-[34px] text-[14px]">
                            <div className="w-[160px] text-[#91918e] flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                Effectif
                            </div>
                            <div className="text-[#37352f]">
                                {selectedCourse.studentCount} étudiant{selectedCourse.studentCount > 1 ? 's' : ''}
                            </div>
                        </div>

                        <div className="flex items-center min-h-[34px] text-[14px]">
                            <div className="w-[160px] text-[#91918e] flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                Type
                            </div>
                            <div className="flex">
                                <span className={`text-[12px] px-2 py-0.5 rounded-sm font-medium border ${COLORS[selectedCourse.type] || COLORS["Default"]}`}>
                                    {selectedCourse.type}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-[#ededed] mb-8"></div>

                    <div>
                        <h4 className="text-[16px] font-semibold text-[#37352f] mb-4">
                            Membres du groupe
                        </h4>
                        {selectedCourse.students && selectedCourse.students.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {selectedCourse.students.map((student: string, index: number) => (
                                    <div key={index} className="flex items-center gap-3 py-1.5 px-2 hover:bg-[#f1f1ef] rounded transition-colors text-[14px] text-[#37352f] cursor-pointer">
                                        <div className="w-5 h-5 flex items-center justify-center border border-[#d3d3d1] rounded text-[11px] text-[#91918e]">
                                            {index + 1}
                                        </div>
                                        {student}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[14px] text-[#91918e] italic py-2">
                                Aucun étudiant listé pour cette classe.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
}