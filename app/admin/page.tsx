"use client";

import { useEffect, useState, useRef, useMemo } from "react";

// ⚠️ URL de l'API Admin Val Town (SANS TOKEN)
const API_URL = "https://ahmedelhaddedwk--fdc38ccc3a6c11f1872942b51c65c3df.web.val.run";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const EN_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
const MAX_ROOMS = 5;

const COLORS: Record<string, string> = {
  "Course": "bg-[#E5F3FF] border-[#0077D4] text-[#0077D4]",
  "Communication": "bg-[#EAF5E9] border-[#2E7D32] text-[#2E7D32]",
  "Exam": "bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]", 
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
  "monday": "lundi", "tuesday": "mardi", "wednesday": "mercredi",
  "thursday": "jeudi", "friday": "vendredi", "saturday": "samedi", "sunday": "dimanche"
};

const API_TO_INDEX: Record<string, number> = {
  "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
};

// --- Helpers de Formatage ---
const extractText = (val: any): string => {
  if (!val) return "";
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && val.value) return String(val.value).trim();
  if (Array.isArray(val) && val.length > 0 && val[0].value) return String(val[0].value).trim();
  return String(val).trim();
};

const parseEuropeanDate = (val: any) => {
  let str = extractText(val);
  if (!str || str === "null" || str.toLowerCase() === "à définir") return null;
  if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
          const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (!isNaN(d.getTime())) return d;
      }
  } else if (str.includes('-')) {
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          if (!isNaN(d.getTime())) return d;
      }
  }
  const d2 = new Date(str);
  return !isNaN(d2.getTime()) ? d2 : null;
};

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

function getPositionStyles(startTime: string, endTime: string, isAvail: boolean = false) {
  if (!startTime || !endTime) return { top: "0%", height: "0%" };
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  const top = ((s / 60 - START_HOUR) / TOTAL_HOURS) * 100; 
  const height = ((e - s) / 60 / TOTAL_HOURS) * 100;
  
  const styles: any = { top: `${top}%`, height: `${height}%` };
  
  // Style Haché discret pour les disponibilités
  if (isAvail) {
      styles.background = "repeating-linear-gradient(45deg, #fafafa, #fafafa 8px, #ffffff 8px, #ffffff 16px)";
  }
  
  return styles;
}

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

function formatMonthTime(timeStr: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}${m !== 0 ? ':' + m.toString().padStart(2, '0') : ''} ${ampm}`;
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

// 🔥 Calcul des séances restantes
const getRemainingSessions = (endDateStr: any) => {
    const endD = parseEuropeanDate(endDateStr);
    if (!endD) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today > endD) return 0;
    
    const diffTime = Math.abs(endD.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
};

const ChevronRight = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>
);

const MenuItem = ({ label, shortcut, isSelected, onClick, hasSubmenu, onMouseEnter, onMouseLeave }: any) => (
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-[#37352f] transition-colors">
        <div className="flex items-center gap-2">
            <div className="w-4 flex justify-center text-gray-800">{isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div>
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
  const [isAvailOpen, setIsAvailOpen] = useState(true); 
  
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedAvailTutors, setSelectedAvailTutors] = useState<string[]>([]);

  useEffect(() => {
    fetch(API_URL)
      .then(async res => {
         if (!res.ok) throw new Error(`Erreur API (${res.status})`);
         return res.json();
      })
      .then(d => { 
          if(d.error) throw new Error(d.error);
          setData(d); 
          setLoading(false); 
      })
      .catch((err) => { 
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
  if (viewMode === 'Jour' || viewMode === "Aujourd'hui") daysLength = 1;
  else if (viewMode.includes('jours')) daysLength = parseInt(viewMode.split(' ')[0]);

  const displayDate = new Date(currentTime);
  displayDate.setHours(0, 0, 0, 0); 
  if (viewMode === 'Semaine') {
      displayDate.setDate(displayDate.getDate() + (offset * 7));
      const day = displayDate.getDay() === 0 ? 6 : displayDate.getDay() - 1;
      displayDate.setDate(displayDate.getDate() - day);
  } else if (viewMode === 'Mois') {
      displayDate.setDate(1); 
      displayDate.setMonth(displayDate.getMonth() + offset);
  } else {
      displayDate.setDate(displayDate.getDate() + (offset * daysLength));
  }

  useEffect(() => {
    setMiniCalBaseDate(new Date(displayDate.getFullYear(), displayDate.getMonth(), 1));
  }, [displayDate.getFullYear(), displayDate.getMonth()]);

  const activeDates = useMemo(() => Array.from({ length: daysLength }).map((_, i) => {
      const d = new Date(displayDate);
      d.setDate(displayDate.getDate() + i);
      return d;
  }), [displayDate.getTime(), daysLength]);

  const getFrenchDayName = (d: Date) => DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];

  const processedSchedules = useMemo(() => {
    if (!data || !data.schedules) return [];

    const events: any[] = [];
    const minuteCountsByDate: Record<number, number[]> = {};

    const cleanScheds = data.schedules.map((s: any) => ({
        ...s,
        classNameStr: extractText(s.className),
        tutorStr: extractText(s.tutor),
        typeStr: extractText(s.type),
        examDateStr: extractText(s.examDate || s.ExamDate || s.exam_date || s.dateExam),
        endDateStr: extractText(s.endDate),
        startDateStr: extractText(s.startDate),
        dayStr: extractText(s.day).toLowerCase()
    }));

    const classGroups: Record<string, any[]> = {};
    cleanScheds.forEach((c: any) => {
        if (!classGroups[c.classNameStr]) classGroups[c.classNameStr] = [];
        classGroups[c.classNameStr].push(c);
    });

    const examSchedules: any[] = [];
    Object.keys(classGroups).forEach(className => {
        const classScheds = classGroups[className];
        if (classScheds.length === 0) return;

        classScheds.sort((a, b) => {
            const dayA = API_TO_INDEX[a.dayStr] ?? 99;
            const dayB = API_TO_INDEX[b.dayStr] ?? 99;
            if (dayA !== dayB) return dayA - dayB;
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        });
        const firstSession = classScheds[0];

        let examField = null;
        for (const sched of classScheds) {
            examField = sched.examDateStr;
            if (examField && examField !== "null" && examField !== "À définir" && examField !== "") break;
        }

        if (examField && examField !== "null" && examField !== "À définir" && examField !== "") {
            const examDateObj = parseEuropeanDate(examField);
            if (examDateObj) {
                const dayIndex = examDateObj.getDay() === 0 ? 6 : examDateObj.getDay() - 1;
                const correctDayStr = Object.keys(API_TO_FRENCH_DAYS).find(key => API_TO_INDEX[key] === dayIndex) || "";
                
                examSchedules.push({
                    ...firstSession,
                    id: firstSession.id + "_exam",
                    typeStr: "Exam",
                    isExam: true,
                    examDateObj: examDateObj,
                    dayStr: correctDayStr,
                    startTime: firstSession.startTime,
                    endTime: firstSession.endTime
                });
            }
        }
    });

    const allGlobalSchedules = [...cleanScheds, ...examSchedules];

    activeDates.forEach(date => {
        const timeMs = date.getTime();
        const dayFr = getFrenchDayName(date).toLowerCase();

        minuteCountsByDate[timeMs] = new Array(1440).fill(0);

        allGlobalSchedules.forEach((s: any) => {
            const sDayFr = API_TO_FRENCH_DAYS[s.dayStr] || s.dayStr;

            if (sDayFr === dayFr) {
                let isValidDate = true;

                if (s.isExam && s.examDateObj) {
                    const ex = new Date(s.examDateObj);
                    ex.setHours(0,0,0,0);
                    isValidDate = date.getTime() === ex.getTime();
                } else {
                    const endD = parseEuropeanDate(s.endDateStr);
                    const startD = parseEuropeanDate(s.startDateStr);
                    if (endD && date > endD) isValidDate = false;
                    if (startD && date < startD) isValidDate = false;
                }

                if (isValidDate) {
                    const evt = {
                        ...s,
                        instanceId: `${s.id}-${timeMs}`,
                        actualDate: date,
                        isAvailability: false
                    };
                    events.push(evt);

                    const startM = timeToMinutes(evt.startTime);
                    const endM = timeToMinutes(evt.endTime);
                    for(let m = startM; m < endM; m++) minuteCountsByDate[timeMs][m]++;
                }
            }
        });
    });

    let filteredEvents = events.filter(c => {
        const matchT = selectedTutors.length === 0 || selectedTutors.includes(c.tutorStr);
        const matchC = selectedClasses.length === 0 || selectedClasses.includes(c.classNameStr);
        const matchS = !searchQuery || c.classNameStr.toLowerCase().includes(searchQuery.toLowerCase()) || c.tutorStr.toLowerCase().includes(searchQuery.toLowerCase());
        return matchT && matchC && matchS;
    });

    const finalEvents: any[] = [];
    activeDates.forEach(date => {
        const dailyEvents = filteredEvents
            .filter(e => e.actualDate.getTime() === date.getTime())
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        
        const columns: any[][] = [];
        
        dailyEvents.forEach(course => {
            const start = timeToMinutes(course.startTime);
            const end = timeToMinutes(course.endTime);
            
            course.isConflicting = dailyEvents.some(other => {
                if (other.instanceId === course.instanceId) return false;
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
        dailyEvents.forEach(e => {
            e.numColumns = numColumns;
            finalEvents.push(e);
        });
    });

    const avails: any[] = [];
    if (selectedAvailTutors.length > 0 && data.tutorsInfo) {
        activeDates.forEach(date => {
            const timeMs = date.getTime();
            const dayFr = getFrenchDayName(date).toLowerCase();
            const minuteCounts = minuteCountsByDate[timeMs];

            selectedAvailTutors.forEach(tName => {
                const profInfo = data.tutorsInfo.find((ti: any) => ti.name === tName);
                if (!profInfo) return;

                const isOff = profInfo.daysOff.some((off: string) => {
                    const offClean = off.trim().toLowerCase();
                    const enMatch = Object.keys(API_TO_FRENCH_DAYS).find(k => k === offClean && API_TO_FRENCH_DAYS[k] === dayFr);
                    return offClean === dayFr || !!enMatch;
                });
                
                if (isOff) return;

                const tutorEventsToday = events.filter(e => e.tutorStr === tName && e.actualDate.getTime() === timeMs);
                let morningMins = 0;
                let afternoonMins = 0;
                let eveningMins = 0;
                let totalMinsWorked = 0;

                tutorEventsToday.forEach(e => {
                    const sM = timeToMinutes(e.startTime);
                    const eM = timeToMinutes(e.endTime);
                    const dur = eM - sM;
                    totalMinsWorked += dur;
                    if (sM < 13 * 60) morningMins += dur;
                    else if (sM < 17 * 60 + 30) afternoonMins += dur;
                    else eveningMins += dur;
                });

                let minsRemaining = (profInfo.workingHours * 60) - totalMinsWorked;
                if (minsRemaining < 60) return;

                const isMorningPref = morningMins >= eveningMins;

                const morningSlots = [{ start: "09:00", end: "10:30", dur: 90 }, { start: "10:30", end: "12:00", dur: 90 }, { start: "11:30", end: "13:00", dur: 90 }];
                const afternoonSlots = [{ start: "14:00", end: "15:30", dur: 90 }, { start: "15:30", end: "17:00", dur: 90 }];
                const eveningSlots = [{ start: "17:30", end: "19:00", dur: 90 }, { start: "19:00", end: "20:30", dur: 90 }];

                let orderedSlots: any[] = [];
                if (afternoonMins > 0) orderedSlots = [...afternoonSlots, ...eveningSlots, ...morningSlots];
                else if (!isMorningPref) orderedSlots = [...eveningSlots, ...morningSlots, ...afternoonSlots];
                else orderedSlots = [...morningSlots, ...eveningSlots, ...afternoonSlots];

                let tempAvails: any[] = [];

                orderedSlots.forEach(slot => {
                    if (minsRemaining < 60) return;
                    
                    let dur = Math.min(minsRemaining, slot.dur);
                    if (dur >= 90) dur = 90;
                    else if (dur >= 60) dur = 60;
                    else return;

                    const sM = timeToMinutes(slot.start);
                    const eM = sM + dur;

                    const isRoomFull = minuteCounts.slice(sM, eM).some(c => c >= MAX_ROOMS);
                    const isProfBusy = tutorEventsToday.some(c => {
                        const cs = timeToMinutes(c.startTime);
                        const ce = timeToMinutes(c.endTime);
                        return sM < ce && eM > cs;
                    });
                    const isAlreadyAvail = tempAvails.some(a => timeToMinutes(a.startTime) < eM && timeToMinutes(a.endTime) > sM);

                    if (!isRoomFull && !isProfBusy && !isAlreadyAvail) {
                        tempAvails.push({
                            tutorStr: tName,
                            classNameStr: `Disponible`,
                            typeStr: "Disponibilité",
                            day: getFrenchDayName(date),
                            startTime: slot.start,
                            endTime: formatMinutesToTime(eM),
                            isAvailability: true,
                            actualDate: date,
                            numColumns: 1,
                            columnIndex: 0
                        });
                        minsRemaining -= dur;
                    }
                });

                if (tempAvails.length > 0) {
                    tempAvails.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                    let merged = [tempAvails[0]];
                    
                    for (let i = 1; i < tempAvails.length; i++) {
                        let last = merged[merged.length - 1];
                        let curr = tempAvails[i];
                        
                        if (last.endTime === curr.startTime) last.endTime = curr.endTime;
                        else merged.push(curr);
                    }
                    
                    merged.forEach((m, idx) => {
                        m.instanceId = `avail-${tName}-${timeMs}-${idx}`;
                        avails.push(m);
                    });
                }
            });
        });
    }

    return [...finalEvents, ...avails];
  }, [data, activeDates, selectedTutors, selectedClasses, selectedAvailTutors, searchQuery]);

  if (errorMsg) return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 font-sans p-6 text-center">
          <div className="text-4xl mb-4">🚨</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Impossible de charger le Dashboard</h2>
          <p className="text-red-800 text-sm max-w-lg bg-white p-4 rounded-lg shadow-sm border border-red-100 font-mono break-words">{errorMsg}</p>
      </div>
  );

  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-gray-400 italic">Chargement Admin...</div>;
  if (!data || !data.schedules) return <div className="h-screen flex flex-col items-center justify-center gap-2"><span className="text-red-500 font-medium">Erreur de données.</span></div>;

  const uniqueClasses = data.classes ? data.classes.filter(Boolean).map(String) : [];
  const uniqueTutors = data.tutors ? data.tutors.filter(Boolean).map(String) : [];

  const currentHour = currentTime.getHours();
  const showTimeLine = currentHour >= START_HOUR && currentHour < END_HOUR;
  const timeLineTop = ((currentHour + currentTime.getMinutes() / 60 - START_HOUR) / TOTAL_HOURS) * 100;

  const handlePrev = () => {
    if (viewMode === 'Mois') setOffset(p => p - 1);
    else if (viewMode === 'Jour' || viewMode === "Aujourd'hui") setOffset(p => p - 1);
    else setOffset(p => p - 1);
  };

  const handleNext = () => {
    if (viewMode === 'Mois') setOffset(p => p + 1);
    else if (viewMode === 'Jour' || viewMode === "Aujourd'hui") setOffset(p => p + 1);
    else setOffset(p => p + 1);
  };

  const handleMiniCalPrevMonth = () => { const n = new Date(miniCalBaseDate); n.setMonth(n.getMonth() - 1); setMiniCalBaseDate(n); };
  const handleMiniCalNextMonth = () => { const n = new Date(miniCalBaseDate); n.setMonth(n.getMonth() + 1); setMiniCalBaseDate(n); };

  const handleMiniCalDateClick = (clickedDate: Date) => {
    const target = new Date(clickedDate); target.setHours(0, 0, 0, 0);
    const current = new Date(currentTime); current.setHours(0, 0, 0, 0);

    if (viewMode === 'Mois') { setOffset((target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth())); } 
    else if (viewMode === 'Jour') { setOffset(Math.round((target.getTime() - current.getTime()) / 86400000)); } 
    else if (viewMode === 'Semaine') {
        const tM = new Date(target); tM.setDate(tM.getDate() - (tM.getDay() === 0 ? 6 : tM.getDay() - 1));
        const cM = new Date(current); cM.setDate(cM.getDate() - (cM.getDay() === 0 ? 6 : cM.getDay() - 1));
        setOffset(Math.round((tM.getTime() - cM.getTime()) / 604800000));
    } else { setOffset(Math.floor(Math.round((target.getTime() - current.getTime()) / 86400000) / daysLength)); }
  };

  const monthDays = viewMode === 'Mois' ? generateMiniCalendar(displayDate, currentTime) : [];

  const formatDate = (val: any) => {
    if (val === undefined || val === null || val === "" || val === "null") return "À définir";
    
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return "À définir";
        return val.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    let str = String(val);
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

  const currentViewLabel = viewMode === 'Jour' && offset === 0 ? "Aujourd'hui" : viewMode;

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

            <div className="px-2 mb-4">
                <button onClick={() => setIsTutorsOpen(!isTutorsOpen)} className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] font-semibold text-[#91918e] hover:bg-[#efefed] rounded transition-colors group">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isTutorsOpen ? 'rotate-90' : ''}`} /> Enseignants ({uniqueTutors.length})
                </button>
                {isTutorsOpen && (
                    <div className="mt-1 flex flex-col space-y-0.5 animate-in fade-in duration-200">
                        {uniqueTutors.map((tutor: string, i: number) => {
                            const isChecked = selectedTutors.includes(tutor);
                            const dotColor = DOT_COLORS[i % DOT_COLORS.length];
                            
                            // 🔥 Calcul des statistiques de l'enseignant
                            const tutorCourses = data.schedules.filter((c: any) => extractText(c.tutor) === tutor);
                            const uniqueClassesCount = new Set(tutorCourses.map((c: any) => extractText(c.className))).size;
                            const totalSessions = tutorCourses.length;
                            let totalHours = 0;
                            tutorCourses.forEach((c: any) => {
                                if (c.startTime && c.endTime) {
                                    totalHours += (timeToMinutes(c.endTime) - timeToMinutes(c.startTime)) / 60;
                                }
                            });

                            return (
                                <div key={tutor} className="flex flex-col mb-1">
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#efefed] rounded cursor-pointer group transition-colors select-none">
                                        <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dotColor.hex : 'white', borderColor: isChecked ? dotColor.hex : '#d1d5db' }}>{isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div>
                                        <input type="checkbox" className="hidden" checked={isChecked} onChange={() => setSelectedTutors(prev => prev.includes(tutor) ? prev.filter(t => t !== tutor) : [...prev, tutor])} />
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor.hex }}></span>
                                        <span className={`text-[13px] truncate transition-colors ${isChecked ? 'text-[#37352f] font-medium' : 'text-[#37352f]'}`}>{tutor}</span>
                                    </label>

                                    {/* 🔥 CASCADE DE STATISTIQUES NOTION-STYLE */}
                                    {isChecked && (
                                        <div className="ml-[34px] mr-2 py-1 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200 border-l border-gray-200 pl-3 mb-2">
                                            <div className="flex items-center justify-between text-[13px] group/stat hover:bg-[#efefed] px-2 py-1.5 rounded transition-colors cursor-default">
                                                <div className="flex items-center gap-2.5 text-[#91918e] font-medium">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                    Classes actives
                                                </div>
                                                <span className="font-medium text-[#37352f]">{uniqueClassesCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[13px] group/stat hover:bg-[#efefed] px-2 py-1.5 rounded transition-colors cursor-default">
                                                <div className="flex items-center gap-2.5 text-[#91918e] font-medium">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    Séances / sem.
                                                </div>
                                                <span className="font-medium text-[#37352f]">{totalSessions}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[13px] group/stat hover:bg-[#efefed] px-2 py-1.5 rounded transition-colors cursor-default">
                                                <div className="flex items-center gap-2.5 text-[#91918e] font-medium">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                    Heures / sem.
                                                </div>
                                                <span className="font-medium text-[#37352f]">{totalHours.toFixed(1)}h</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="px-2 mb-4">
                <button onClick={() => setIsClassesOpen(!isClassesOpen)} className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] font-semibold text-[#91918e] hover:bg-[#efefed] rounded transition-colors group">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isClassesOpen ? 'rotate-90' : ''}`} /> Classes actives ({uniqueClasses.length})
                </button>
                {isClassesOpen && (
                    <div className="mt-1 flex flex-col space-y-0.5 animate-in fade-in duration-200">
                        {uniqueClasses.map((className: string, i: number) => {
                            const isChecked = selectedClasses.includes(className);
                            const dotColor = DOT_COLORS[(i + 3) % DOT_COLORS.length];
                            return (
                                <label key={className} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#efefed] rounded cursor-pointer group transition-colors select-none">
                                    <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dotColor.hex : 'white', borderColor: isChecked ? dotColor.hex : '#d1d5db' }}>{isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div>
                                    <input type="checkbox" className="hidden" checked={isChecked} onChange={() => setSelectedClasses(prev => prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className])} />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor.hex }}></span>
                                    <span className={`text-[13px] truncate transition-colors ${isChecked ? 'text-[#37352f] font-medium' : 'text-[#37352f]'}`}>{className}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="px-2 mb-4">
                <button onClick={() => setIsAvailOpen(!isAvailOpen)} className="flex items-center gap-1.5 w-full px-2 py-1 text-[12px] font-semibold text-[#91918e] hover:bg-[#efefed] rounded transition-colors group">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isAvailOpen ? 'rotate-90' : ''}`} /> Disponibilités Auto
                </button>
                {isAvailOpen && (
                    <div className="mt-1 flex flex-col space-y-0.5 animate-in fade-in duration-200">
                        {uniqueTutors.map((tutor: string) => {
                            const isChecked = selectedAvailTutors.includes(tutor);
                            const dotColor = { hex: '#91918e' }; 
                            return (
                                <label key={`avail-${tutor}`} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#efefed] rounded cursor-pointer group transition-colors select-none">
                                    <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors" style={{ backgroundColor: isChecked ? dotColor.hex : 'white', borderColor: isChecked ? dotColor.hex : '#d1d5db' }}>{isChecked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}</div>
                                    <input type="checkbox" className="hidden" checked={isChecked} onChange={() => setSelectedAvailTutors(prev => prev.includes(tutor) ? prev.filter(t => t !== tutor) : [...prev, tutor])} />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor.hex }}></span>
                                    <span className={`text-[13px] truncate transition-colors ${isChecked ? 'text-[#37352f] font-medium' : 'text-[#37352f]'}`}>{tutor}</span>
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
                    
                    {/* 🔥 SÉLECTEUR DE VUE STYLE NOTION AVEC FLÈCHES */}
                    <div className="relative flex items-center gap-2">
                        <div className="relative">
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
                                    <div className="absolute top-full mt-2 right-0 md:left-0 w-56 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-1.5 z-50 font-sans text-[13px] animate-in fade-in zoom-in-95 duration-100">
                                        <MenuItem label="Aujourd'hui" shortcut="T" isSelected={viewMode === 'Jour' && offset === 0} onClick={() => {setViewMode('Jour'); setOffset(0); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                        <MenuItem label="Semaine" shortcut="W" isSelected={viewMode === 'Semaine'} onClick={() => {setViewMode('Semaine'); setOffset(0); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                        <MenuItem label="Mois" shortcut="M" isSelected={viewMode === 'Mois'} onClick={() => {setViewMode('Mois'); setOffset(0); setViewMenuOpen(false); setNumDaysExpanded(false);}} />
                                        
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
                                                {[2,3,4,5,6,7,8,9].map(n => (
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

                        <div className="flex items-center text-gray-700 bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
                            <button onClick={handlePrev} className="px-2 py-1.5 hover:bg-gray-100 border-r border-gray-200 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                            <button onClick={handleNext} className="px-2 py-1.5 hover:bg-gray-100 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
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
                            const daySchedules = processedSchedules
                                .filter((c: any) => c.actualDate.getTime() === day.dateObj.getTime())
                                .sort((a: any, b: any) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                            return (
                                <div key={i} className={`border-b border-r border-gray-200 p-1 flex flex-col gap-0.5 overflow-hidden ${!day.isCurrentMonth ? 'bg-gray-50/40' : 'bg-white'}`}>
                                    <div className="flex justify-end px-1 mt-0.5 mb-1"><span className={`text-[12px] font-medium px-1.5 min-w-[24px] h-6 flex items-center justify-center rounded-full ${day.isToday ? 'bg-[#EB5757] text-white' : (day.isCurrentMonth ? 'text-[#37352f]' : 'text-gray-400')}`}>{day.num === 1 ? <span className="capitalize">{day.dateObj.toLocaleDateString('fr-FR', { month: 'short' })} {day.num}</span> : day.num}</span></div>
                                    <div className="flex flex-col gap-[1px] overflow-y-auto custom-scrollbar flex-1 px-0.5 pb-1">
                                        {daySchedules.map((course: any) => {
                                            if (course.isAvailability) return null; 
                                            const colorClass = COLORS[course.typeStr] || COLORS["Default"];
                                            const hexMatch = colorClass.match(/text-\[([^\]]+)\]/);
                                            const hexColor = hexMatch ? hexMatch[1] : "#91918e";
                                            
                                            return (
                                                <div key={course.instanceId || course.id} onClick={() => setSelectedCourse(course)} className="group text-[11px] px-1 py-[2px] rounded-[4px] cursor-pointer transition-colors hover:bg-gray-100 flex items-center gap-1.5">
                                                    <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: hexColor }}></div>
                                                    {course.isConflicting && !course.isExam && <span className="text-[10px] shrink-0">⚠️</span>}
                                                    <span className="font-semibold shrink-0" style={{ color: hexColor, opacity: 0.85 }}>{formatMonthTime(course.startTime)}</span>
                                                    <span className="font-semibold text-[#37352f] truncate">{course.classNameStr} {course.isExam && "— Examen"}</span>
                                                    <span className="text-[#91918e] truncate shrink-0 ml-1">{course.tutorStr}</span>
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
                                    const isActualToday = date.toDateString() === currentTime.toDateString();
                                    return (
                                        <div key={index} className={`flex-1 border-r border-gray-100 last:border-r-0 relative ${isActualToday ? "bg-[#FFF0F0]/20" : ""}`}>
                                            {isActualToday && showTimeLine && offset === 0 && viewMode === 'Semaine' && <div className="absolute w-2 h-2 rounded-full bg-[#EB5757] z-20 -ml-1" style={{ top: `calc(${timeLineTop}% - 4px)` }} />}
                                            
                                            {processedSchedules.filter((c: any) => c.actualDate.getTime() === date.getTime()).map((course: any) => {
                                                const isAvail = course.isAvailability;
                                                const widthPct = 100 / (course.numColumns || 1);
                                                const leftPct = (course.columnIndex || 0) * widthPct;

                                                return (
                                                    <div 
                                                        key={course.instanceId || course.id} 
                                                        onClick={() => !isAvail && setSelectedCourse(course)} 
                                                        style={{ ...getPositionStyles(course.startTime, course.endTime, isAvail), left: `${leftPct}%`, width: `calc(${widthPct}% - 2px)` }} 
                                                        className={`absolute p-2 rounded-[4px] overflow-hidden shadow-sm z-20 transition-transform flex flex-col ${isAvail ? 'cursor-default opacity-90' : `border-l-[4px] cursor-pointer hover:scale-[1.02] ${course.isConflicting && !course.isExam ? "bg-[#FFF0F0] border-[#EB5757] text-[#EB5757] ring-1 ring-[#EB5757]" : (COLORS[course.typeStr] || COLORS["Default"])}`}`}
                                                    >
                                                        <div className="font-semibold text-[12px] truncate leading-tight mb-0.5 flex items-center gap-1">{course.isConflicting && !course.isExam && <span>⚠️</span>}{course.classNameStr} {course.isExam && "— Examen"}</div>
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
      {selectedCourse && (
        <>
            <div className="fixed inset-0 bg-black/20 z-[60] transition-opacity" onClick={() => setSelectedCourse(null)} />
            <div className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[70] transform transition-transform animate-in slide-in-from-right duration-300 border-l border-[#e5e5e5] flex flex-col font-sans">
                <div className="h-12 flex items-center justify-between px-3 shrink-0 border-b border-[#e5e5e5]">
                    <button onClick={() => setSelectedCourse(null)} className="p-1.5 hover:bg-[#efefed] rounded text-[#91918e] transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    {selectedCourse.isConflicting && !selectedCourse.isExam && <div className="text-[12px] font-medium text-[#EB5757] flex items-center gap-1.5 bg-[#FFF0F0] px-3 py-1 rounded-full border border-[#EB5757]/20">⚠️ Conflit d'horaire</div>}
                </div>
                <div className="px-10 pb-10 flex-1 overflow-y-auto custom-scrollbar">
                    <h3 className="text-[32px] font-bold text-[#37352f] mb-6 mt-4 leading-tight flex items-center gap-3">📄 {selectedCourse.classNameStr} {selectedCourse.isExam && "(Examen)"}</h3>
                    
                    {selectedCourse.isConflicting && !selectedCourse.isExam && (
                      <div className="mb-6 bg-[#fffbe6] border border-[#e6c170] rounded-lg p-4 flex gap-3 text-[#7d6023] animate-in fade-in duration-300">
                        <span className="text-2xl mt-0.5">⚠️</span>
                        <div><p className="font-semibold text-[14px]">Attention : Conflit d'horaire détecté</p><p className="text-[13px] mt-0.5 opacity-90">Cette séance chevauche une autre séance sur ce même créneau horaire. Ajustez les horaires pour résoudre le conflit.</p></div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mb-8 text-[14px]">
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Enseignant</div><div className="text-[#37352f] font-medium">{selectedCourse.tutorStr}</div></div>
                        <div className="flex items-center min-h-[34px]"><div className="w-[160px] text-[#91918e] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Horaire</div><div className={`text-[#37352f] ${selectedCourse.isConflicting && !selectedCourse.isExam ? "text-[#EB5757] font-bold" : ""}`}>{selectedCourse.startTime} — {selectedCourse.endTime}</div></div>
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