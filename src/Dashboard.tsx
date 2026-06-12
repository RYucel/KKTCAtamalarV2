import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { CSV_DATA } from './data';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Search, Filter, ArrowUpDown, ChevronDown, ChevronUp, Users, UserPlus, UserMinus, Building2, Activity, Landmark, Download } from 'lucide-react';
import { cn } from './lib/utils';
import { RecordEntry, StatCard } from './types';

// Parsing data
const GOVERNMENT_PERIODS = [
  { name: 'Mevcut Hükümet (Üstel)', party: 'UBP', start: new Date(2022, 3, 26).getTime(), end: new Date(2026, 5, 12).getTime() },
  { name: 'F. Sucuoğlu Hükümetleri', party: 'UBP', start: new Date(2021, 10, 5).getTime(), end: new Date(2022, 3, 26).getTime() },
  { name: 'E. Saner Hükümeti', party: 'UBP', start: new Date(2020, 11, 9).getTime(), end: new Date(2021, 10, 5).getTime() },
  { name: 'E. Tatar Hükümeti', party: 'UBP', start: new Date(2019, 4, 22).getTime(), end: new Date(2020, 11, 9).getTime() },
  { name: 'T. Erhürman Hükümeti', party: 'CTP', start: new Date(2018, 1, 2).getTime(), end: new Date(2019, 4, 22).getTime() },
  { name: 'H. Özgürgün Hükümeti', party: 'UBP', start: new Date(2016, 3, 16).getTime(), end: new Date(2018, 1, 2).getTime() },
  { name: 'Ö. Kalyoncu Hükümeti', party: 'CTP', start: new Date(2015, 6, 16).getTime(), end: new Date(2016, 3, 16).getTime() },
  { name: 'Ö. Yorgancıoğlu Hükümeti', party: 'CTP', start: new Date(2013, 8, 2).getTime(), end: new Date(2015, 6, 16).getTime() },
  { name: 'S. Siber Hükümeti', party: 'CTP', start: new Date(2013, 5, 13).getTime(), end: new Date(2013, 8, 2).getTime() },
  { name: 'İ. Küçük Hükümeti', party: 'UBP', start: new Date(2010, 4, 27).getTime(), end: new Date(2013, 5, 13).getTime() },
  { name: 'D. Eroğlu Hükümeti', party: 'UBP', start: new Date(2009, 4, 5).getTime(), end: new Date(2010, 4, 27).getTime() },
  { name: 'F.S. Soyer Hükümeti', party: 'CTP', start: new Date(2005, 3, 26).getTime(), end: new Date(2009, 4, 5).getTime() }, 
  { name: 'M.A. Talat Hükümeti', party: 'CTP', start: new Date(2004, 0, 13).getTime(), end: new Date(2005, 3, 26).getTime() },
];

const getGovernmentInfo = (effectiveDate: string, decisionDate: string, year: number) => {
  let date = new Date(year, 5, 1); // default to June 1st of the year
  
  const dateStr = effectiveDate && effectiveDate !== 'Tarih Yok' ? effectiveDate : 
                 (decisionDate && decisionDate !== 'Tarih Yok' ? decisionDate : null);

  if (dateStr) {
    const months: Record<string, number> = {
      'OCAK': 0, 'ŞUBAT': 1, 'MART': 2, 'NİSAN': 3, 'MAYIS': 4, 'HAZİRAN': 5,
      'TEMMUZ': 6, 'AĞUSTOS': 7, 'EYLÜL': 8, 'EKİM': 9, 'KASIM': 10, 'ARALIK': 11
    };
    
    // DD/MM/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      date = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
    } else {
      // MM/YYYY
      const slashYM = dateStr.match(/(\d{1,2})\/(\d{4})/);
      if (slashYM) {
        date = new Date(parseInt(slashYM[2]), parseInt(slashYM[1]) - 1, 15);
      } else {
        // DD MONTH YYYY
        const spaceMatch = dateStr.toUpperCase().match(/(\d{1,2})\s+([A-ZÇĞİÜÖŞ]+)\s+(\d{4})/);
        if (spaceMatch && months[spaceMatch[2]] !== undefined) {
          date = new Date(parseInt(spaceMatch[3]), months[spaceMatch[2]], parseInt(spaceMatch[1]));
        }
      }
    }
  }

  const d = date.getTime();
  
  for (const period of GOVERNMENT_PERIODS) {
    if (d >= period.start && d < period.end) {
      return { party: period.party, government: period.name };
    }
  }

  return { party: 'Bilinmeyen', government: 'Bilinmeyen' };
};

const rawData: RecordEntry[] = Papa.parse(CSV_DATA, {
  header: true,
  skipEmptyLines: true,
}).data.map((row: any) => {
  const year = parseInt(row['Yıl'], 10) || 0;
  const decisionDate = row['Karar Tarihi (Resmi Gazete)']?.trim() || '';
  const effectiveDate = row['Geçerlilik Tarihi (Metinden)']?.trim() || '';
  
  const govInfo = getGovernmentInfo(effectiveDate, decisionDate, year);

  return {
    year,
    type: row['İşlem Türü']?.trim() || '',
    institution: row['Kurum ve Mevki']?.trim() || '',
    name: row['İsim']?.trim() || '',
    decisionDate,
    effectiveDate,
    party: govInfo.party,
    government: govInfo.government
  };
});

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof RecordEntry, direction: 'asc' | 'desc' } | null>({
    key: 'year',
    direction: 'desc'
  });
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedParty, setSelectedParty] = useState<string>('All');

  // Stats calculation
  const stats = useMemo(() => {
    const total = rawData.length;
    const appointments = rawData.filter(d => d.type.toLowerCase().includes('atama')).length;
    const dismissals = rawData.filter(d => d.type.toLowerCase().includes('görevden alma')).length;
    
    // Most active year
    const yearCounts = rawData.reduce((acc, curr) => {
      if (curr.year > 0) acc[curr.year] = (acc[curr.year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const mostActiveYear = Object.keys(yearCounts).reduce((a, b) => yearCounts[parseInt(a)] > yearCounts[parseInt(b)] ? a : b, '');

    return [
      { title: "Toplam İşlem", value: total, description: "Toplam kaydedilen işlem", trend: "neutral" },
      { title: "Atamalar", value: appointments, description: "Toplam atama", trend: "up" },
      { title: "Görevden Almalar", value: dismissals, description: "Toplam görevden alma", trend: "down" },
      { title: "En Aktif Yıl", value: mostActiveYear, description: `${yearCounts[parseInt(mostActiveYear)] || 0} işlem kaydedildi`, trend: "neutral" },
    ] as StatCard[];
  }, []);

  // Additional Government Stats
  const govStats = useMemo(() => {
    // 2006'dan itibaren aktif olan hükümetleri filtrele
    const activeFrom2006 = GOVERNMENT_PERIODS.filter(p => p.end >= new Date(2006, 0, 1).getTime());
    const totalPeriods = activeFrom2006.length;
    
    let longestPeriod = activeFrom2006[0];
    let maxDuration = 0;
    const now = new Date().getTime();
    
    activeFrom2006.forEach(p => {
      const end = Math.min(p.end, now);
      const duration = end - p.start;
      if (duration > maxDuration) {
        maxDuration = duration;
        longestPeriod = p;
      }
    });

    const maxDays = Math.floor(maxDuration / (1000 * 60 * 60 * 24));
    const currentGov = GOVERNMENT_PERIODS[0];

    return [
      { title: "Hükümet Sayısı (2006'dan beri)", value: totalPeriods.toString(), description: "Kayıtlı farklı hükümet dönemi", icon: <Building2 className="w-5 h-5 text-indigo-600" /> },
      { title: "En Uzun Hükümet", value: `${Math.floor(maxDays / 365)}y ${maxDays % 365}g`, description: `${longestPeriod.name} (${longestPeriod.party})`, icon: <Activity className="w-5 h-5 text-indigo-600" /> },
      { title: "Mevcut Hükümet", value: currentGov.name, description: `${currentGov.party} Liderliğinde`, icon: <Landmark className="w-5 h-5 text-indigo-600" /> }
    ];
  }, []);

  // Visualizations Data
  const { yearlyData, typeData, topInstitutions, partyData } = useMemo(() => {
    // Yearly trend
    const yearsMap = new Map<number, { name: string, Atama: number, 'Görevden Alma': number }>();
    rawData.forEach(d => {
      if (d.year === 0) return;
      if (!yearsMap.has(d.year)) {
        yearsMap.set(d.year, { name: d.year.toString(), Atama: 0, 'Görevden Alma': 0 });
      }
      const yearObj = yearsMap.get(d.year)!;
      if (d.type.toLowerCase().includes('atama')) yearObj.Atama++;
      else if (d.type.toLowerCase().includes('görevden alma')) yearObj['Görevden Alma']++;
    });
    const yearlyData = Array.from(yearsMap.values()).sort((a, b) => parseInt(a.name) - parseInt(b.name));

    // Type distribution
    const typesCount = rawData.reduce((acc, curr) => {
      const type = curr.type.toLowerCase().includes('atama') ? 'Atama' : 'Görevden Alma';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const typeData = Object.keys(typesCount).map(k => ({ name: k, value: typesCount[k] }));

    // Top institutions
    const instCount = rawData.reduce((acc, curr) => {
      let inst = curr.institution.split(',')[0].trim();
      if (!inst) inst = "Bilinmeyen";
      acc[inst] = (acc[inst] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topInstitutions = Object.keys(instCount)
      .map(k => ({ name: k, amount: instCount[k] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Political parties distribution
    const partyCount = rawData.reduce((acc, curr) => {
      if (curr.party !== 'Bilinmeyen') {
        acc[curr.party] = (acc[curr.party] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const partyData = Object.keys(partyCount).map(k => ({ name: k, value: partyCount[k] }));

    return { yearlyData, typeData, topInstitutions, partyData };
  }, []);

  // Filtering & Sorting
  const filteredData = useMemo(() => {
    let filterResult = rawData.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.institution.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = selectedType === 'All' || item.type.toLowerCase().includes(selectedType.toLowerCase());
      const matchParty = selectedParty === 'All' || item.party === selectedParty;
      return matchSearch && matchType && matchParty;
    });

    if (sortConfig) {
      filterResult.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filterResult;
  }, [searchTerm, selectedType, selectedParty, sortConfig]);

  const requestSort = (key: keyof RecordEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const csvDataConfig = filteredData.map(row => ({
      'Yıl': row.year,
      'İşlem Türü': row.type,
      'Kurum ve Mevki': row.institution,
      'İsim': row.name,
      'Karar Tarihi': row.decisionDate,
      'Geçerlilik Tarihi': row.effectiveDate,
      'Hükümet': row.government,
      'Parti': row.party
    }));
    const csv = Papa.unparse(csvDataConfig);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kktc_atamalar.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (key: keyof RecordEntry) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col w-full">
      {/* Header aligned to theme */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase">KKTC Atama <span className="text-indigo-600">Takip</span></h1>
        </div>
        <div className="hidden sm:flex text-xs font-semibold text-slate-500 uppercase tracking-widest">
          İnteraktif Görselleştirme
        </div>
      </header>

      <main className="flex-grow p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Government Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          {govStats.map((stat, idx) => (
            <div key={`gov-stat-${idx}`} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.title}</p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">{stat.value}</div>
                <div className="text-slate-500 text-xs">{stat.description}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
        {stats.map((stat, idx) => {
          const isHighlight = idx === 3;
          return (
            <div key={idx} className={cn(
              "p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col",
              isHighlight ? "bg-indigo-600 text-white" : "bg-white hover:shadow-md transition-shadow"
            )}>
              <div className="flex justify-between items-start mb-2 lg:mb-4">
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", isHighlight ? "text-indigo-200" : "text-slate-400")}>{stat.title}</p>
                {!isHighlight && (
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    stat.trend === 'up' ? 'bg-emerald-50 text-emerald-500' : 
                    stat.trend === 'down' ? 'bg-rose-50 text-rose-500' : 
                    'bg-slate-100 text-slate-500'
                  )}>
                    {stat.trend === 'up' ? 'ARTIŞ' : stat.trend === 'down' ? 'AZALIŞ' : '—'}
                  </div>
                )}
                {isHighlight && <div className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest">Aktif</div>}
              </div>
              <div className="flex items-end justify-between mt-auto">
                <span className={cn("text-3xl font-bold truncate pr-3", isHighlight ? "text-white" : "text-slate-800")}>{stat.value}</span>
                <span className={cn("text-xs whitespace-nowrap", isHighlight ? "text-indigo-200" : "text-slate-400")}>{stat.description.split(" ")[0]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 shrink-0">
        {/* Trend line */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-6 lg:col-span-8">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-600 rounded-full"></span> Zaman İçindeki Aktivite
          </h2>
          <div className="h-72 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{stroke: '#f3f4f6', strokeWidth: 2}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                <Line type="monotone" dataKey="Atama" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Görevden Alma" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-600 rounded-full"></span> İşlem Dağılımı
          </h2>
          <div className="h-72 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Atama' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 shrink-0">
        {/* Top Institutions Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-6 lg:col-span-8">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-600 rounded-full"></span> En Aktif Kurumlar
          </h2>
          <div className="h-80 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topInstitutions} layout="vertical" margin={{ top: 0, right: 30, left: 150, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 12}} width={140} />
                <RechartsTooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                  {topInstitutions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Political Party Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col p-6 lg:col-span-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-600 rounded-full"></span> Parti Dağılımı
          </h2>
          <div className="h-80 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {partyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'UBP' ? '#f59e0b' : entry.name === 'CTP' ? '#10b981' : '#cbd5e1'} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Detaylı Kayıtlar</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Party Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select 
                value={selectedParty} 
                onChange={(e) => setSelectedParty(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none min-w-[120px] text-slate-600 font-semibold"
              >
                <option value="All">Tüm Partiler</option>
                <option value="UBP">UBP Dönemi</option>
                <option value="CTP">CTP Dönemi</option>
                <option value="Bilinmeyen">Bilinmeyen</option>
              </select>
            </div>
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none min-w-[140px] text-slate-600 font-semibold"
              >
                <option value="All">Tüm Türler</option>
                <option value="atama">Atama</option>
                <option value="görevden alma">Görevden Alma</option>
              </select>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="İsim veya kurum ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>
            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white hover:bg-slate-50 text-slate-600 font-semibold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV İndir</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-grow flex flex-col">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('year')}>
                  <div className="flex items-center">Tarih {getSortIcon('year')}</div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                  <div className="flex items-center">İsim {getSortIcon('name')}</div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('institution')}>
                  <div className="flex items-center">Kurum {getSortIcon('institution')}</div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('party')}>
                  <div className="flex items-center">Hükümet / Parti {getSortIcon('party')}</div>
                </th>
                <th className="px-6 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center">Tür {getSortIcon('type')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredData.length > 0 ? (
                filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{row.year}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{row.name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 line-clamp-2 md:line-clamp-none">{row.institution}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800">{row.government}</span>
                        <span className={cn(
                          "text-[9px] uppercase tracking-widest font-bold",
                          row.party === 'UBP' ? 'text-amber-500' : row.party === 'CTP' ? 'text-emerald-500' : 'text-slate-400'
                        )}>{row.party}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded uppercase whitespace-nowrap",
                        row.type.toLowerCase().includes('atama') ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {row.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Arama kriterlerine uygun kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Toplam {rawData.length} kayıttan {filteredData.length} tanesi gösteriliyor
          </span>
        </div>
      </div>
      </main>

      {/* Footer Bar */}
      <footer className="h-10 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] font-medium text-slate-400 shrink-0 uppercase tracking-widest mt-auto">
        <div>Toplam İşlem Senkronizasyonu: <span className="text-slate-600">{rawData.length} Kayıt Yüklendi</span></div>
      </footer>
    </div>
  );
};

export default Dashboard;
