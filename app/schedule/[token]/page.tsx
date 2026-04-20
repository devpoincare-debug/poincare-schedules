"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";

// ⚠️ L'URL DE L'API PROFESSEUR (Celle qui lit le token)
const API_URL = "https://ahmedelhaddedwk--95e089743a3611f1b31342b51c65c3df.web.val.run/";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

const COLORS: Record<string, string> = {
  "Course": "bg-[#E5F3FF] border-[#0077D4] text-[#004A87]",
  "Communication": "bg-[#EAF5E9] border-[#2E7D32] text-[#1B5E20]",
  "Default": "bg-[#F3E8FF] border-[#7E22CE] text-[#4C1D95]",
};

const API_TO_FRENCH_DAYS: Record<string, string> = {
  "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
  "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche"
};

const getFrenchDayName = (d: Date) => DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];

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

// 🔥 Nouvelle fonction pour la vue Mois
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

const MenuItem = ({ label, shortcut, isSelected, onClick, hasSubmenu, onMouseEnter, onMouseLeave }: any) => (
    <div 
        onClick={onClick} 
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-[#37352f] transition-colors"
    >
        <div className="flex items-center gap-2">
            <div className="w-4 flex justify-center text-gray-800">
                {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <span>{label}</span>
        </div>
        <div className="flex items-center gap-3">
            {shortcut && <span className="text-gray-400 text-[11px] font-semibold tracking-wide">{shortcut}</span>}
            {hasSubmenu && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
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
  const [numDaysHovered, setNumDaysHovered] = useState(false);

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
  if (viewMode === 'Jour') daysLength = 1;
  else if (viewMode.includes('jours')) daysLength = parseInt(viewMode.split(' ')[0]);

  // 🔥 Ajustement de l'affichage pour la vue Mois
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
  
  const schedules = rawSchedules.map((course: any) => {
    const courseStart = timeToMinutes(course.startTime);
    const courseEnd = timeToMinutes(course.endTime);
    const isConflicting = rawSchedules.some((other: any) => {
        if (other.id === course.id) return false; 
        if (other.day !== course.day) return false; 
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        return courseStart < otherEnd && courseEnd > otherStart;
    });
    return { ...course, isConflicting };
  });

  const uniqueClassesCount = new Set(schedules.map((c: any) => c.className)).size;
  const totalSessions = schedules.length;
  let totalHours = 0;
  schedules.forEach((c: any) => {
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

  // 🔥 Logique de décalage intelligente
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
                <div className="relative">
                    <button 
                        onClick={() => setViewMenuOpen(!viewMenuOpen)}
                        className="flex items-center gap-2 text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        {viewMode}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    
                    {viewMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setViewMenuOpen(false)}></div>
                            <div className="absolute top-full mt-2 left-0 md:right-0 md:left-auto w-56 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 z-50 font-sans text-[13px] animate-in fade-in zoom-in-95 duration-100">
                                <MenuItem label="Jour" shortcut="1 ou D" isSelected={viewMode === 'Jour'} onClick={() => {setViewMode('Jour'); setOffset(0); setViewMenuOpen(false);}} />
                                <MenuItem label="Semaine" shortcut="0 ou W" isSelected={viewMode === 'Semaine'} onClick={() => {setViewMode('Semaine'); setOffset(0); setViewMenuOpen(false);}} />
                                <MenuItem label="Mois" shortcut="M" isSelected={viewMode === 'Mois'} onClick={() => {setViewMode('Mois'); setOffset(0); setViewMenuOpen(false);}} />
                                
                                <div className="h-px bg-gray-200 my-1 mx-3"></div>
                                
                                <div className="relative group" onMouseEnter={() => setNumDaysHovered(true)} onMouseLeave={() => setNumDaysHovered(false)}>
                                    <MenuItem label="Nombre de jours" hasSubmenu={true} isSelected={viewMode.includes('jours')} onClick={() => {}} />
                                    
                                    {numDaysHovered && (
                                        <div className="absolute top-0 right-full h-full w-2 bg-transparent z-50"></div>
                                    )}

                                    {numDaysHovered && (
                                        <div className="absolute top-0 right-full mr-1 w-48 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 animate-in fade-in slide-in-from-right-2 duration-100 z-50">
                                            {[2,3,4,5,6,7,8,9].map(n => (
                                                <MenuItem key={n} label={`${n} jours`} shortcut={`${n}`} isSelected={viewMode === `${n} jours`} onClick={() => {setViewMode(`${n} jours`); setOffset(0); setViewMenuOpen(false); setNumDaysHovered(false);}} />
                                            ))}
                                            <div className="h-px bg-gray-200 my-1 mx-3"></div>
                                            <MenuItem label="Autre..." isSelected={false} onClick={() => { setViewMenuOpen(false); setNumDaysHovered(false); }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button 
                  onClick={() => { setOffset(0); setViewMode('Semaine'); }} 
                  className="text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Aujourd'hui
                </button>

                <div className="flex items-center text-gray-700 bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
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
                                .filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName)
                                .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

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
                                                    {course.isConflicting && <span className="text-[10px] shrink-0">⚠️</span>}
                                                    <span className="font-semibold shrink-0" style={{ color: hexColor, opacity: 0.85 }}>
                                                        {formatMonthTime(course.startTime)}
                                                    </span>
                                                    <span className="font-semibold text-[#37352f] truncate">
                                                        {course.className}
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
                            {showTimeLine && offset === 0 && viewMode === 'Semaine' && (
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
                            
                            {showTimeLine && offset === 0 && viewMode === 'Semaine' && (
                                <div 
                                    className="absolute w-full border-b border-[#EB5757] z-10 opacity-50" 
                                    style={{ top: `${timeLineTop}%` }} 
                                />
                            )}

                            <div className="absolute inset-0 flex">
                                {activeDates.map((date, index) => {
                                    const dayName = getFrenchDayName(date);
                                    const isActualToday = date.toDateString() === currentTime.toDateString();
                                    
                                    return (
                                        <div key={index} className={`flex-1 border-r border-gray-100 last:border-r-0 relative ${isActualToday ? "bg-[#FFF0F0]/20" : ""}`}>
                                            {isActualToday && showTimeLine && offset === 0 && viewMode === 'Semaine' && (
                                                <div className="absolute w-2 h-2 rounded-full bg-[#EB5757] z-20 -ml-1" style={{ top: `calc(${timeLineTop}% - 4px)` }} />
                                            )}
                                            
                                            {schedules.filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName).map((course: any) => (
                                                <div 
                                                    key={course.id} 
                                                    onClick={() => setSelectedCourse(course)}
                                                    style={getPositionStyles(course.startTime, course.endTime)} 
                                                    className={`absolute inset-x-[2px] p-2 rounded-md border-l-[4px] text-[11px] overflow-hidden shadow-sm z-20 cursor-pointer transition-transform hover:scale-[1.02] flex flex-col ${
                                                        course.isConflicting 
                                                            ? "bg-[#FFF0F0] border-[#EB5757] text-[#EB5757] ring-1 ring-[#EB5757]" 
                                                            : (COLORS[course.type] || COLORS["Default"])
                                                    }`}
                                                >
                                                    <div className="font-semibold text-[12px] truncate leading-tight mb-0.5 flex items-center gap-1">
                                                        {course.isConflicting && <span title="Conflit d'horaire">⚠️</span>}
                                                        {course.className}
                                                    </div>
                                                    <div className="opacity-90 font-medium text-[11px] truncate">{course.startTime} - {course.endTime}</div>
                                                </div>
                                            ))}
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
                    {selectedCourse.isConflicting && (
                        <div className="text-[12px] font-medium text-[#EB5757] flex items-center gap-1.5 bg-[#FFF0F0] px-3 py-1 rounded-full border border-[#EB5757]/20">
                            ⚠️ Conflit d'horaire détecté
                        </div>
                    )}
                </div>

                <div className="px-10 pb-10 flex-1 overflow-y-auto custom-scrollbar">
                    
                    <h3 className="text-[32px] font-bold text-[#37352f] mb-6 mt-4 leading-tight flex items-center gap-3">
                        📄 {selectedCourse.className}
                    </h3>

                    {selectedCourse.isConflicting && (
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
                            <div className={`text-[#37352f] ${selectedCourse.isConflicting ? "text-[#EB5757] font-bold" : ""}`}>
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