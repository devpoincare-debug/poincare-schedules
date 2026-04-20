"use client";

import { useEffect, useState, useRef, useMemo } from "react";

// ⚠️ URL de l'API Admin Val Town (sans token)
const API_URL = "https://ahmedelhaddedwk--fdc38ccc3a6c11f1872942b51c65c3df.web.val.run";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
const MAX_ROOMS = 5; // 🔥 LIMITE GLOBALE DE SALLES SIMULTANÉES

const COLORS: Record<string, string> = {
  "Course": "bg-[#E5F3FF] border-[#0077D4] text-[#0077D4]",
  "Communication": "bg-[#EAF5E9] border-[#2E7D32] text-[#2E7D32]",
  "Default": "bg-[#F3E8FF] border-[#7E22CE] text-[#7E22CE]",
};

const DOT_COLORS = [
    { border: "border-blue-400", bg: "bg-blue-400", text: "text-blue-400", hex: "#3B82F6" },
    { border: "border-purple-400", bg: "bg-purple-400", text: "text-purple-400", hex: "#A855F7" },
    { border: "border-green-400", bg: "bg-green-400", text: "text-green-400", hex: "#22C55E" },
    { border: "border-orange-400", bg: "bg-orange-400", text: "text-orange-400", hex: "#F97316" },
    { border: "border-pink-400", bg: "bg-pink-400", text: "text-pink-400", hex: "#EC4899" },
    { border: "border-red-400", bg: "bg-red-400", text: "text-red-400", hex: "#EF4444" }
];

const API_TO_FRENCH_DAYS: Record<string, string> = {
  "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
  "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche"
};

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

function formatMinutesToTime(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [miniCalBaseDate, setMiniCalBaseDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState('Semaine');
  const [offset, setOffset] = useState(0);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [numDaysHovered, setNumDaysHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isTutorsOpen, setIsTutorsOpen] = useState(true);
  const [isClassesOpen, setIsClassesOpen] = useState(true);
  
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [showAvailabilities, setShowAvailabilities] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then(async res => {
         if (!res.ok) throw new Error(`Erreur API (${res.status}): ${await res.text()}`);
         return res.json();
      })
      .then(d => { 
          if(d.error) throw new Error(d.error);
          setData(d); 
          setLoading(false); 
      })
      .catch((err) => { 
          console.error("Fetch error:", err); 
          setErrorMsg(err.message); 
          setLoading(false); 
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchActive]);

  let daysLength = 7;
  if (viewMode === 'Jour') daysLength = 1;
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

  if (errorMsg) return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 font-sans p-6 text-center">
          <div className="text-4xl mb-4">🚨</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Impossible de charger le Dashboard</h2>
          <p className="text-red-800 text-sm max-w-lg bg-white p-4 rounded-lg shadow-sm border border-red-100 font-mono break-words">{errorMsg}</p>
      </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-gray-400 italic">Chargement Admin...</div>;
  if (!data || !data.schedules) return <div className="h-screen flex flex-col items-center justify-center gap-2"><span className="text-red-500 font-medium">Erreur de données.</span></div>;

  const rawSchedules = data.schedules || [];
  
  const extractText = (val: any): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.value) return String(val.value);
    if (Array.isArray(val) && val.length > 0 && val[0].value) return String(val[0].value);
    return String(val);
  };

  const parseEuropeanDate = (val: any) => {
    let str = extractText(val);
    if (!str || str === "null" || str === "À définir") return null;
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) return d;
        }
    }
    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  const uniqueClasses = data.classes ? data.classes.filter(Boolean).map(String) : [];
  const uniqueTutors = data.tutors ? data.tutors.filter(Boolean).map(String) : [];

  const toggleTutor = (tutor: string) => setSelectedTutors(prev => prev.includes(tutor) ? prev.filter(t => t !== tutor) : [...prev, tutor]);
  const toggleClass = (className: string) => setSelectedClasses(prev => prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]);

  const activeDates = Array.from({ length: daysLength }).map((_, i) => {
      const d = new Date(displayDate);
      d.setDate(displayDate.getDate() + i);
      return d;
  });

  const getFrenchDayName = (d: Date) => DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];

  // 🔥 CALCULATEUR DE DISPONIBILITÉ + GESTION GLOBALE DES SALLES (MAX 5)
  const availabilities = useMemo(() => {
    if (!showAvailabilities || !data?.tutorsInfo) return [];
    const avails: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Calcul de l'occupation GLOBALE des salles pour chaque date active
    const globalOccupancyByDate = new Map();
    activeDates.forEach(date => {
        const dateOnly = new Date(date);
        dateOnly.setHours(0,0,0,0);
        if (dateOnly < today) return;

        const dayFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][date.getDay()];
        
        // Toutes les classes de l'école actives ce jour-là
        const activeSchedulesToday = rawSchedules.filter((c: any) => {
            const cDay = API_TO_FRENCH_DAYS[c.day] || c.day;
            if (cDay !== dayFr) return false;
            const ed = parseEuropeanDate(c.endDate);
            if (ed && dateOnly > ed) return false; // Classe terminée
            return true;
        });

        // Tableau des minutes pour compter les salles utilisées simultanément
        const minuteCounts = new Array(24 * 60).fill(0);
        activeSchedulesToday.forEach((c: any) => {
            const s = timeToMinutes(c.startTime);
            const e = timeToMinutes(c.endTime);
            for (let m = s; m < e; m++) {
                minuteCounts[m]++;
            }
        });

        // Créer des blocs "Occupés" dès qu'on a atteint la limite des 5 salles
        const occupiedBlocks = [];
        let startBlock = null;
        for (let m = START_HOUR * 60; m <= END_HOUR * 60; m++) {
            if (minuteCounts[m] >= MAX_ROOMS) {
                if (startBlock === null) startBlock = m;
            } else {
                if (startBlock !== null) {
                    occupiedBlocks.push([startBlock, m]);
                    startBlock = null;
                }
            }
        }
        if (startBlock !== null) occupiedBlocks.push([startBlock, END_HOUR * 60]);
        
        globalOccupancyByDate.set(dateOnly.getTime(), occupiedBlocks);
    });

    // 2. Calcul des disponibilités pour chaque enseignant
    const activeTutorsList = selectedTutors.length > 0 
        ? data.tutorsInfo.filter((t: any) => selectedTutors.includes(t.name))
        : data.tutorsInfo;

    activeTutorsList.forEach((tutor: any) => {
        if (!tutor.workingHours || tutor.workingHours <= 0) return;

        const tutorCourses = rawSchedules.filter((c: any) => extractText(c.tutor) === tutor.name);
        
        let maxEndDate = today;
        let hasClasses = false;
        tutorCourses.forEach((c: any) => {
            const ed = parseEuropeanDate(c.endDate);
            if (ed) {
                hasClasses = true;
                if (ed > maxEndDate) maxEndDate = ed;
            }
        });
        if (!hasClasses) return; // Si prof n'a pas de classes, impossible de deviner son maxEndDate

        activeDates.forEach(date => {
            const dateOnly = new Date(date);
            dateOnly.setHours(0,0,0,0);

            // Pas de dispo dans le passé ni après la fin de tous ses contrats actuels
            if (dateOnly < today || dateOnly > maxEndDate) return;

            const dayEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
            const dayFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][date.getDay()];

            if (tutor.daysOff.includes(dayEn) || tutor.daysOff.includes(dayFr)) return;

            // Ses cours à LUI aujourd'hui
            const classesToday = tutorCourses.filter((c: any) => {
                const cDay = API_TO_FRENCH_DAYS[c.day] || c.day;
                if (cDay !== dayFr) return false;
                const ed = parseEuropeanDate(c.endDate);
                if (ed && dateOnly > ed) return false; 
                return true;
            });

            let workedMinutes = 0;
            const occupied: number[][] = [];
            classesToday.forEach((c: any) => {
                const s = timeToMinutes(c.startTime);
                const e = timeToMinutes(c.endTime);
                workedMinutes += (e - s);
                occupied.push([s, e]);
            });

            // ⚠️ AJOUTER LES BLOCS OÙ LES 5 SALLES SONT PLEINES
            const globalOccupied = globalOccupancyByDate.get(dateOnly.getTime()) || [];
            occupied.push(...globalOccupied);

            let remainingMins = (tutor.workingHours * 60) - workedMinutes;
            if (remainingMins < 60) return; // Ignore les miettes < 1h
            remainingMins = Math.floor(remainingMins / 60) * 60; // Troncature à l'heure (avantage au prof)

            occupied.sort((a,b) => a[0] - b[0]);
            const merged: number[][] = [];
            if (occupied.length > 0) {
                let curr = [...occupied[0]];
                for (let i=1; i<occupied.length; i++) {
                    if (occupied[i][0] <= curr[1]) curr[1] = Math.max(curr[1], occupied[i][1]);
                    else { merged.push(curr); curr = [...occupied[i]]; }
                }
                merged.push(curr);
            }

            let freeBlocks: number[][] = [];
            let lastEnd = START_HOUR * 60;
            merged.forEach(occ => {
                if (occ[0] > lastEnd) freeBlocks.push([lastEnd, occ[0]]);
                lastEnd = Math.max(lastEnd, occ[1]);
            });
            if (END_HOUR * 60 > lastEnd) freeBlocks.push([lastEnd, END_HOUR * 60]);

            freeBlocks = freeBlocks.filter(b => (b[1] - b[0]) >= 60);

            const finalSlots: any[] = [];
            const allocate = (prefStart: number, prefEnd: number) => {
                for (let i=0; i<freeBlocks.length; i++) {
                    if (remainingMins < 60) break;
                    let block = freeBlocks[i];
                    let overlapStart = Math.max(block[0], prefStart);
                    let overlapEnd = Math.min(block[1], prefEnd);
                    
                    if (overlapStart < overlapEnd && (overlapEnd - overlapStart) >= 60) {
                        let duration = Math.min(overlapEnd - overlapStart, remainingMins);
                        duration = Math.floor(duration / 60) * 60; 
                        
                        if (duration >= 60) {
                            finalSlots.push({
                                id: `avail-${tutor.name}-${dateOnly.getTime()}-${overlapStart}`,
                                tutorStr: tutor.name,
                                classNameStr: "Disponible",
                                typeStr: "Disponibilité",
                                day: dayFr,
                                startTime: formatMinutesToTime(overlapStart),
                                endTime: formatMinutesToTime(overlapStart + duration),
                                isAvailability: true,
                            });
                            remainingMins -= duration;
                            block[0] = overlapStart + duration; 
                        }
                    }
                }
            };

            allocate(1050, 1230); // Priorité 17h30 - 20h30
            if (remainingMins >= 60) allocate(START_HOUR * 60, END_HOUR * 60); 

            avails.push(...finalSlots);
        });
    });
    return avails;
  }, [showAvailabilities, data, activeDates, rawSchedules, selectedTutors]);

  let filteredSchedules = rawSchedules;
  if (selectedTutors.length > 0 || selectedClasses.length > 0) {
      filteredSchedules = filteredSchedules.filter((c: any) => {
          const matchTutor = selectedTutors.length === 0 || selectedTutors.includes(extractText(c.tutor));
          const matchClass = selectedClasses.length === 0 || selectedClasses.includes(extractText(c.className));
          return matchTutor && matchClass;
      });
  }

  if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSchedules = filteredSchedules.filter((c: any) => 
          extractText(c.className).toLowerCase().includes(query) || extractText(c.tutor).toLowerCase().includes(query)
      );
  }

  const combinedSchedules = [...filteredSchedules.map((course: any) => ({
    ...course, 
    classNameStr: extractText(course.className),
    tutorStr: extractText(course.tutor),
    typeStr: extractText(course.type),
    examDateStr: extractText(course.examDate),
    endDateStr: extractText(course.endDate),
    isAvailability: false
  })), ...availabilities];

  const schedules = combinedSchedules.map((course: any) => {
    const courseStart = timeToMinutes(course.startTime);
    const courseEnd = timeToMinutes(course.endTime);
    const isConflicting = course.isAvailability ? false : combinedSchedules.some((other: any) => {
        if (other.id === course.id || other.isAvailability) return false; 
        if (other.day !== course.day) return false; 
        return courseStart < timeToMinutes(other.endTime) && courseEnd > timeToMinutes(other.startTime);
    });
    return { ...course, isConflicting };
  });

  const currentHour = currentTime.getHours();
  const showTimeLine = currentHour >= START_HOUR && currentHour < END_HOUR;
  const timeLineTop = ((currentHour + currentTime.getMinutes() / 60 - START_HOUR) / TOTAL_HOURS) * 100;

  const handleMiniCalPrevMonth = () => { const d = new Date(miniCalBaseDate); d.setMonth(d.getMonth() - 1); setMiniCalBaseDate(d); };
  const handleMiniCalNextMonth = () => { const d = new Date(miniCalBaseDate); d.setMonth(d.getMonth() + 1); setMiniCalBaseDate(d); };

  const handleMiniCalDateClick = (clickedDate: Date) => {
    const target = new Date(clickedDate); target.setHours(0, 0, 0, 0);
    const current = new Date(currentTime); current.setHours(0, 0, 0, 0);
    if (viewMode === 'Mois') { setOffset((target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth())); } 
    else if (viewMode === 'Jour') { setOffset(Math.round((target.getTime() - current.getTime()) / 86400000)); } 
    else if (viewMode === 'Semaine') {
        const targetMonday = new Date(target); targetMonday.setDate(targetMonday.getDate() - (targetMonday.getDay() === 0 ? 6 : targetMonday.getDay() - 1));
        const currentMonday = new Date(current); currentMonday.setDate(currentMonday.getDate() - (currentMonday.getDay() === 0 ? 6 : currentMonday.getDay() - 1));
        setOffset(Math.round((targetMonday.getTime() - currentMonday.getTime()) / 604800000));
    } else { setOffset(Math.floor(Math.round((target.getTime() - current.getTime()) / 86400000) / daysLength)); }
  };

  const monthDays = viewMode === 'Mois' ? generateMiniCalendar(displayDate, currentTime) : [];

  const formatDate = (val: any) => {
    let str = extractText(val);
    if (!str || str === "null" || str === "À définir") return "À définir";
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) { const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    }
    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) return d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return str; 
  };

  const getRemainingSessions = (endDateVal: any) => {
    let str = extractText(endDateVal);
    if (!str || str === "null" || str === "À définir") return "?";
    let d;
    if (str.includes('/')) { const parts = str.split('/'); if (parts.length === 3) d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); } 
    else { d = new Date(str); }
    if (!d || isNaN(d.getTime())) return "?";
    return Math.max(0, Math.ceil((d.getTime() - currentTime.getTime()) / 604800000));
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden relative">
      <aside className={`flex flex-col border-r border-gray-200 bg-[#FBFBFB] transition-all duration-300 ${isSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden border-none'}`}>
        <div className="h-14 flex items-center justify-between px-4 w-full flex-none">
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-[#efefed] rounded text-[#91918e] transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg></button>
            <div className="flex items-center gap-1">
                <button onClick={() => {setIsSearchActive(!isSearchActive); if (isSearchActive) setSearchQuery('');}} className={`p-1 rounded transition-colors ${isSearchActive ? 'bg-[#efefed] text-[#37352f]' : 'hover:bg-[#efefed] text-[#91918e]'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>
            </div>
        </div>

        <div className="py-2 flex-1 overflow-y-auto custom-scrollbar">
            {isSearchActive && (
                <div className="px-4 mb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative flex items-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input ref={searchInputRef} type="search" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-gray-200/50 border border-transparent focus:bg-white rounded text-[13px] text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" />
                    </div>
                </div>
            )}

            <div className="mb-6 px-4">
                <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-[13px] font-bold text-gray-800 capitalize tracking-tight">{miniCalBaseDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    <div className="flex gap-1">
                        <button onClick={handleMiniCalPrevMonth} className="p-1 hover:bg-[#efefed] rounded text-[#91918e] transition-colors"><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                        <button onClick={handleMiniCalNextMonth} className="p-1 hover:bg-[#efefed] rounded text-[#91918e] transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-tighter"><span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span></div>
                <div className="grid grid-cols-7 text-center text-[12px] gap-y-0.5">
                    {generateMiniCalendar(miniCalBaseDate, currentTime).map((day, i) => {
                        const isSelectedWeek = activeDates.some(wd => wd.toDateString() === day.dateObj.toDateString());
                        return <button key={i} onClick={() => handleMiniCalDateClick(day.dateObj)} className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto transition-colors ${day.isToday ? "bg-[#EB5757] text-white font-bold shadow-sm" : isSelectedWeek && viewMode !== 'Mois' ? "bg-[#E5F3FF] text-[#0077D4] font-bold" : day.isCurrentMonth ? "text-gray-700 hover:bg-gray-200 font-medium" : "text-gray-300 hover:bg-gray-100"}`}>{day.num}</button>;
                    })}
                </div>
            </div>

            <div className="mx-4 mb-4 border-t border-gray-200"></div>

            {/* FILTRES ENSEIGNANTS */}
            <div className="px-2 mb-4">
                <button onClick={() => setIsTutorsOpen(!isTutorsOpen)} className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] font-semibold text-[#91918e] hover:bg-[#efefed] rounded transition-colors group">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isTutorsOpen ? 'rotate-90' : ''}`} />
                    Enseignants ({uniqueTutors.length})
                </button>
                {isTutorsOpen && (
                    <div className="mt-1 flex flex-col space-y-0.5 animate-in fade-in duration-200">
                        {uniqueTutors.map((tutor: string, i: number) => {
                            const isChecked = selectedTutors.includes(tutor);
                            const dotColor = DOT_COLORS[i % DOT_COLORS.length];
                            
                            const tutorCourses = rawSchedules.filter((c: any) => extractText(c.tutor) === tutor);
                            const uniqueClassesCount = new Set(tutorCourses.map((c: any) => extractText(c.className))).size;
                            let tutorHours = 0;
                            tutorCourses.forEach((c: any) => { if(c.startTime && c.endTime) tutorHours += (timeToMinutes(c.endTime) - timeToMinutes(c.startTime)) / 60; });

                            return (
                                <div key={tutor} className="flex flex-col mb-1">
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#efefed] rounded cursor-pointer group transition-colors select-none">
                                        <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dotColor.hex : 'white', borderColor: isChecked ? dotColor.hex : '#d1d5db' }}>
                                            {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleTutor(tutor)} />
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor.hex }}></span>
                                        <span className={`text-[13px] truncate transition-colors ${isChecked ? 'text-[#37352f] font-medium' : 'text-[#37352f]'}`}>{tutor}</span>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 🔥 BOUTON MODE DISPONIBILITÉS */}
            <div className="px-4 mb-5">
                <label className={`flex items-center justify-between cursor-pointer p-2.5 rounded-lg border transition-all ${showAvailabilities ? 'bg-[#EAF5E9] border-[#2E7D32]/30 text-[#1B5E20]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span className="text-[12px] font-bold tracking-tight">Disponibilités</span>
                    </div>
                    <div className={`relative w-8 h-4 rounded-full transition-colors ${showAvailabilities ? 'bg-[#2E7D32]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showAvailabilities ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <input type="checkbox" className="hidden" checked={showAvailabilities} onChange={() => setShowAvailabilities(!showAvailabilities)} />
                </label>
            </div>

            <div className="px-2 mb-4">
                <button onClick={() => setIsClassesOpen(!isClassesOpen)} className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] font-semibold text-[#91918e] hover:bg-[#efefed] rounded transition-colors group">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isClassesOpen ? 'rotate-90' : ''}`} />
                    Classes actives ({uniqueClasses.length})
                </button>
                {isClassesOpen && (
                    <div className="mt-1 flex flex-col space-y-0.5 animate-in fade-in duration-200">
                        {uniqueClasses.map((className: string, i: number) => {
                            const isChecked = selectedClasses.includes(className);
                            const dotColor = DOT_COLORS[(i + 3) % DOT_COLORS.length];
                            return (
                                <label key={className} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#efefed] rounded cursor-pointer group transition-colors select-none">
                                    <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dotColor.hex : 'white', borderColor: isChecked ? dotColor.hex : '#d1d5db' }}>
                                        {isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleClass(className)} />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor.hex }}></span>
                                    <span className={`text-[13px] truncate transition-colors ${isChecked ? 'text-[#37352f] font-medium' : 'text-[#37352f]'}`}>{className}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 flex-none">
            <div className="flex items-center gap-4">
                {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-[#efefed] text-[#91918e] transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
                <h2 className="text-xl font-bold text-gray-800 capitalize">{displayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="flex gap-4 items-center">
                <div className="flex gap-2 text-[13px] font-medium items-center">
                    <div className="relative">
                        <button onClick={() => setViewMenuOpen(!viewMenuOpen)} className="flex items-center gap-2 text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">{viewMode}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        {viewMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setViewMenuOpen(false)}></div>
                                <div className="absolute top-full mt-2 right-0 md:left-0 w-56 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 z-50 font-sans text-[13px] animate-in fade-in zoom-in-95 duration-100">
                                    <MenuItem label="Jour" shortcut="1 ou D" isSelected={viewMode === 'Jour'} onClick={() => {setViewMode('Jour'); setOffset(0); setViewMenuOpen(false);}} />
                                    <MenuItem label="Semaine" shortcut="0 ou W" isSelected={viewMode === 'Semaine'} onClick={() => {setViewMode('Semaine'); setOffset(0); setViewMenuOpen(false);}} />
                                    <MenuItem label="Mois" shortcut="M" isSelected={viewMode === 'Mois'} onClick={() => {setViewMode('Mois'); setOffset(0); setViewMenuOpen(false);}} />
                                    <div className="h-px bg-gray-200 my-1 mx-3"></div>
                                    <div className="relative group" onMouseEnter={() => setNumDaysHovered(true)} onMouseLeave={() => setNumDaysHovered(false)}>
                                        <MenuItem label="Nombre de jours" hasSubmenu={true} isSelected={viewMode.includes('jours')} onClick={() => {}} />
                                        {numDaysHovered && <div className="absolute top-0 right-full h-full w-2 bg-transparent z-50"></div>}
                                        {numDaysHovered && (
                                            <div className="absolute top-0 right-full mr-1 w-48 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 animate-in fade-in slide-in-from-right-2 duration-100 z-50">
                                                {[2,3,4,5,6,7,8,9].map(n => <MenuItem key={n} label={`${n} jours`} shortcut={`${n}`} isSelected={viewMode === `${n} jours`} onClick={() => {setViewMode(`${n} jours`); setOffset(0); setViewMenuOpen(false); setNumDaysHovered(false);}} />)}
                                                <div className="h-px bg-gray-200 my-1 mx-3"></div>
                                                <MenuItem label="Autre..." isSelected={false} onClick={() => { setViewMenuOpen(false); setNumDaysHovered(false); }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <button onClick={() => setOffset(0)} className="text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">Aujourd'hui</button>
                    <div className="flex items-center text-gray-700 bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                        <button onClick={() => setOffset(p => p - 1)} className="px-2 py-1.5 hover:bg-gray-100 border-r border-gray-200 transition-colors"><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                        <button onClick={() => setOffset(p => p + 1)} className="px-2 py-1.5 hover:bg-gray-100 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>
        </header>

        <div className="flex flex-1 overflow-auto">
            {viewMode === 'Mois' ? (
                <div className="flex flex-col min-w-[800px] w-full bg-white h-full">
                    <div className="grid grid-cols-7 border-b border-gray-200 flex-none bg-white">
                        {DAYS.map(day => <div key={day} className="py-2 text-center text-[12px] font-medium text-[#91918e] capitalize tracking-wide">{day.substring(0, 3)}</div>)}
                    </div>
                    <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l border-gray-200">
                        {monthDays.map((day, i) => {
                            const dayName = getFrenchDayName(day.dateObj);
                            const daySchedules = schedules
                                .filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName || c.day === dayName)
                                .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                            return (
                                <div key={i} className={`border-b border-r border-gray-200 p-1 flex flex-col gap-0.5 overflow-hidden ${!day.isCurrentMonth ? 'bg-gray-50/40' : 'bg-white'}`}>
                                    <div className="flex justify-end px-1 mt-0.5 mb-1"><span className={`text-[12px] font-medium px-1.5 min-w-[24px] h-6 flex items-center justify-center rounded-full ${day.isToday ? 'bg-[#EB5757] text-white' : (day.isCurrentMonth ? 'text-[#37352f]' : 'text-gray-400')}`}>{day.num === 1 ? <span className="capitalize">{day.dateObj.toLocaleDateString('fr-FR', { month: 'short' })} {day.num}</span> : day.num}</span></div>
                                    <div className="flex flex-col gap-[1px] overflow-y-auto custom-scrollbar flex-1 px-0.5 pb-1">
                                        {daySchedules.map((course: any) => {
                                            const isAvail = course.isAvailability;
                                            const colorClass = isAvail ? "text-[#4B5563]" : (COLORS[course.typeStr] || COLORS["Default"]);
                                            const hexMatch = colorClass.match(/text-\[([^\]]+)\]/);
                                            const hexColor = hexMatch ? hexMatch[1] : "#91918e";
                                            
                                            return (
                                                <div key={course.id} onClick={() => !isAvail && setSelectedCourse(course)} className={`group text-[11px] px-1 py-[2px] rounded-[4px] cursor-pointer transition-colors flex items-center gap-1.5 ${isAvail ? "bg-[#F3F4F6] border border-dashed border-[#9CA3AF]" : "hover:bg-gray-100"}`}>
                                                    {!isAvail && <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: hexColor }}></div>}
                                                    {course.isConflicting && <span className="text-[10px] shrink-0">⚠️</span>}
                                                    <span className="font-semibold shrink-0" style={{ color: hexColor, opacity: 0.85 }}>{formatMonthTime(course.startTime)}</span>
                                                    <span className="font-semibold text-[#37352f] truncate">{course.classNameStr}</span>
                                                    {!isAvail && <span className="text-[#91918e] truncate shrink-0 ml-1">{course.tutorStr}</span>}
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
                <div className="min-w-[800px] flex w-full relative">
                    <div className="w-16 flex-none border-r border-gray-200 relative bg-white z-20 flex flex-col">
                        <div className="h-14 border-b border-gray-200"></div>
                        <div className="relative flex-1 min-h-[800px]">
                            {HOURS.map(h => <div key={h} className="absolute w-full text-right pr-2 text-[10px] font-medium text-gray-400 -translate-y-1/2" style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }}>{formatNotionHour(h)}</div>)}
                            {showTimeLine && offset === 0 && viewMode === 'Semaine' && <div className="absolute w-full text-right pr-1 -translate-y-1/2 z-30" style={{ top: `${timeLineTop}%` }}><span className="bg-[#EB5757] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">{formatExactTime(currentTime)}</span></div>}
                        </div>
                    </div>

                    <div className="flex-auto flex flex-col relative">
                        <div className="flex h-14 border-b border-gray-200 bg-white sticky top-0 z-10">
                            {activeDates.map((date, index) => {
                                const dayName = getFrenchDayName(date);
                                const isActualToday = date.toDateString() === currentTime.toDateString();
                                return (
                                    <div key={index} className={`flex-1 text-center flex flex-col items-center justify-center border-r border-gray-100 last:border-r-0 transition-colors ${isActualToday ? "bg-[#FFF0F0]/10" : ""}`}>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${isActualToday ? "text-[#EB5757]" : "text-gray-400"}`}>{dayName}</span>
                                        <div className={`text-[15px] font-medium leading-none flex items-center justify-center ${isActualToday ? "text-white bg-[#EB5757] rounded-full w-6 h-6 shadow-sm" : "text-gray-700 w-6 h-6"}`}>{date.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex-1 relative h-full min-h-[800px]">
                            {HOURS.map(h => <div key={h} className="absolute w-full border-b border-gray-50" style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} />)}
                            {showTimeLine && offset === 0 && viewMode === 'Semaine' && <div className="absolute w-full border-b border-[#EB5757] z-10 opacity-50" style={{ top: `${timeLineTop}%` }} />}

                            <div className="absolute inset-0 flex">
                                {activeDates.map((date, index) => {
                                    const dayName = getFrenchDayName(date);
                                    const isActualToday = date.toDateString() === currentTime.toDateString();
                                    return (
                                        <div key={index} className={`flex-1 border-r border-gray-100 last:border-r-0 relative ${isActualToday ? "bg-[#FFF0F0]/20" : ""}`}>
                                            {isActualToday && showTimeLine && offset === 0 && viewMode === 'Semaine' && <div className="absolute w-2 h-2 rounded-full bg-[#EB5757] z-20 -ml-1" style={{ top: `calc(${timeLineTop}% - 4px)` }} />}
                                            
                                            {schedules.filter((c: any) => API_TO_FRENCH_DAYS[c.day] === dayName || c.day === dayName).map((course: any) => {
                                                const isAvail = course.isAvailability;
                                                const colorClasses = isAvail 
                                                    ? "bg-[#F9FAFB]/90 border-[#D1D5DB] text-[#6B7280] border-dashed border-[2px]" 
                                                    : (course.isConflicting ? "bg-[#FFF0F0] border-[#EB5757] text-[#EB5757] ring-1 ring-[#EB5757] border-l-[4px]" : `border-l-[4px] ${COLORS[course.typeStr] || COLORS["Default"]}`);
                                                
                                                return (
                                                    <div key={course.id} onClick={() => !isAvail && setSelectedCourse(course)} style={getPositionStyles(course.startTime, course.endTime)} className={`absolute inset-x-[2px] p-2 rounded-md overflow-hidden shadow-sm z-20 transition-transform flex flex-col ${isAvail ? '' : 'cursor-pointer hover:scale-[1.02]'} ${colorClasses}`}>
                                                        <div className={`font-bold ${isAvail ? 'text-[11px]' : 'text-[12px]'} truncate leading-tight mb-0.5 flex items-center gap-1`}>
                                                            {course.isConflicting && <span>⚠️</span>}
                                                            {isAvail ? `${course.classNameStr} - ${course.tutorStr}` : course.classNameStr}
                                                        </div>
                                                        <div className="text-[11px] opacity-90 truncate font-medium">{course.startTime} - {course.endTime}</div>
                                                        {!isAvail && <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] opacity-80 font-medium truncate"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>{course.tutorStr}</div>}
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

      {/* --- SIDE PEEK (MODALE) --- */}
      {selectedCourse && !selectedCourse.isAvailability && (
        <>
            <div className="fixed inset-0 bg-black/20 z-[60] transition-opacity" onClick={() => setSelectedCourse(null)} />
            <div className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[70] transform transition-transform animate-in slide-in-from-right duration-300 border-l border-[#e5e5e5] flex flex-col font-sans">
                <div className="h-12 flex items-center justify-between px-3 shrink-0 border-b border-[#e5e5e5]">
                    <button onClick={() => setSelectedCourse(null)} className="p-1.5 hover:bg-[#efefed] rounded text-[#91918e] transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    {selectedCourse.isConflicting && <div className="text-[12px] font-medium text-[#EB5757] flex items-center gap-1.5 bg-[#FFF0F0] px-3 py-1 rounded-full border border-[#EB5757]/20">⚠️ Conflit d'horaire</div>}
                </div>
                <div className="px-10 pb-10 flex-1 overflow-y-auto custom-scrollbar">
                    <h3 className="text-[32px] font-bold text-[#37352f] mb-6 mt-4 leading-tight flex items-center gap-3">📄 {selectedCourse.classNameStr}</h3>
                    {selectedCourse.isConflicting && (
                      <div className="mb-6 bg-[#fffbe6] border border-[#e6c170] rounded-lg p-4 flex gap-3 text-[#7d6023] animate-in fade-in duration-300"><span className="text-2xl mt-0.5">⚠️</span><div><p className="font-semibold text-[14px]">Attention : Conflit d'horaire détecté</p><p className="text-[13px] mt-0.5 opacity-90">Cette séance chevauche une autre séance sur ce même créneau horaire. Ajustez les horaires pour résoudre le conflit.</p></div></div>
                    )}
                    <div className="flex flex-col gap-2 mb-8 text-[14px]">
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Enseignant</div><div className="text-[#37352f] font-medium">{selectedCourse.tutorStr}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Horaire</div><div className={`text-[#37352f] ${selectedCourse.isConflicting ? "text-[#EB5757] font-bold" : ""}`}>{selectedCourse.startTime} — {selectedCourse.endTime}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Effectif</div><div className="text-[#37352f]">{selectedCourse.studentCount} étudiant{selectedCourse.studentCount > 1 ? 's' : ''}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>Type</div><div className="flex"><span className={`text-[12px] px-2 py-0.5 rounded-sm font-medium border ${COLORS[selectedCourse.typeStr] || COLORS["Default"]}`}>{selectedCourse.typeStr}</span></div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Date Examen</div><div className="text-[#37352f]">{formatDate(selectedCourse.examDateStr)}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Fin de session</div><div className="text-[#37352f]">{formatDate(selectedCourse.endDateStr)}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>Séances restantes</div><div className="text-[#37352f]">{getRemainingSessions(selectedCourse.endDateStr)} séance(s)</div></div>
                    </div>
                    <div className="w-full h-px bg-[#ededed] mb-8"></div>
                    <div>
                        <h4 className="text-[16px] font-semibold text-[#37352f] mb-4">Membres du groupe</h4>
                        {selectedCourse.students && selectedCourse.students.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {selectedCourse.students.map((student: string, index: number) => (
                                    <div key={index} className="flex items-center gap-3 py-1.5 px-2 hover:bg-[#f1f1ef] rounded transition-colors text-[14px] text-[#37352f] cursor-pointer">
                                        <div className="w-5 h-5 flex items-center justify-center border border-[#d3d3d1] rounded text-[11px] text-[#91918e]">{index + 1}</div>
                                        {extractText(student)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[14px] text-[#91918e] italic py-2">Aucun étudiant listé pour cette classe.</div>
                        )}
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
}