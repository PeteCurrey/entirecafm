'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Calendar, FileText, CheckCircle2, ShieldAlert, Plus, Building2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isPast, getMonth, getYear, setYear, parseISO, startOfMonth } from 'date-fns';
import { getCategoryInfo } from '@/lib/assetCategories';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SiteStats {
  score: number;
  total: number;
  completed: number;
  overdue: number;
}

export default function PPMPlannerPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  
  const [assets, setAssets] = useState<any[]>([]);
  const [siteData, setSiteData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initial load
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const clientData = await res.json();
          // For demo/simplicity, we map them assuming an API expansion would handle sites grouped by client
          // Quick fetch of all sites to group them
          const sitesRes = await fetch('/api/sites');
          if (sitesRes.ok) {
             const allSites = await sitesRes.json();
             const mapped = clientData.map((c: any) => ({
                ...c,
                sites: allSites.filter((s: any) => s.clientId === c.id)
             }));
             setClients(mapped);
             
             // Expand first client and select first site by default
             if (mapped.length > 0) {
               setExpandedClients({ [mapped[0].id]: true });
               if (mapped[0].sites.length > 0) {
                 setSelectedSiteId(mapped[0].sites[0].id);
                 setSiteData(mapped[0].sites[0]);
               }
             }
          }
        }
      } catch (err) {
        console.error('Failed to load tree:', err);
      }
    };
    fetchTree();
  }, []);

  // Fetch plan when site or year changes
  const fetchPlan = async () => {
    if (!selectedSiteId) return;
    try {
      const res = await fetch(`/api/ppm/plans?siteId=${selectedSiteId}`);
      if (res.ok) {
        setAssets(await res.json());
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [selectedSiteId]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerate = async () => {
    if (!selectedSiteId) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ppm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId, year: selectedYear })
      });
      if (res.ok) {
        fetchPlan();
      }
    } catch (err) {
      console.error('Failed to generate:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Process data for the grid
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Group assets by category for the rows
  const categoryGroups: Record<string, { category: string, assets: any[] }> = {};
  assets.forEach(asset => {
    const assetTasksForYear = asset.ppmTasks.filter((t: any) => getYear(new Date(t.dueDate)) === selectedYear);
    if (assetTasksForYear.length > 0) {
      if (!categoryGroups[asset.category]) {
        categoryGroups[asset.category] = { category: asset.category, assets: [] };
      }
      categoryGroups[asset.category].assets.push({ ...asset, tasks: assetTasksForYear });
    }
  });

  // Compliance Calculation (Mock logic based on fetched tasks)
  let totalTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;
  
  assets.forEach(a => {
    a.ppmTasks.filter((t: any) => getYear(new Date(t.dueDate)) === selectedYear).forEach((t: any) => {
        totalTasks++;
        if (t.status === 'COMPLETED') completedTasks++;
        else if (isPast(new Date(t.dueDate)) && t.status !== 'COMPLETED') overdueTasks++;
    });
  });

  const complianceScore = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);
  const scoreColor = complianceScore > 90 ? 'text-[#22C55E]' : complianceScore > 70 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
  const scoreBorder = complianceScore > 90 ? 'border-[#22C55E]' : complianceScore > 70 ? 'border-[#F59E0B]' : 'border-[#EF4444]';

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden gap-6 animate-in fade-in duration-500">
      
      {/* LEFT SIDEBAR - SITE TREE */}
      <div className="w-[280px] shrink-0 bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#334155] shrink-0">
          <h2 className="text-lg font-bold text-white font-inter tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#E91E8C]" />
            PPM Planner
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">Select a site to view its PPM plan</p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {clients.map(client => (
            <div key={client.id} className="mb-1">
              <button 
                onClick={() => toggleClient(client.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-[#334155]/30 rounded-md transition-colors text-left"
              >
                <span className="text-sm font-bold text-white uppercase tracking-wider truncate pr-2">
                  {client.name}
                </span>
                {expandedClients[client.id] ? 
                  <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0" /> : 
                  <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                }
              </button>
              
              {expandedClients[client.id] && (
                <div className="pl-2 mt-1 space-y-1">
                  {client.sites?.map((site: any) => (
                    <button
                      key={site.id}
                      onClick={() => { setSelectedSiteId(site.id); setSiteData(site); }}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-sm text-left transition-all",
                        selectedSiteId === site.id 
                          ? "bg-[#E91E8C]/10 text-[#E91E8C] border border-[#E91E8C]/20 font-bold" 
                          : "text-[#94A3B8] hover:bg-[#334155]/20 hover:text-white"
                      )}
                    >
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{site.name}</span>
                    </button>
                  ))}
                  {(!client.sites || client.sites.length === 0) && (
                    <div className="text-xs text-[#475569] pl-8 py-1 italic">No sites mapped</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT MAIN AREA */}
      <div className="flex-1 flex flex-col bg-[#0D0D0D] overflow-hidden rounded-lg border border-[#334155]">
        {!selectedSiteId ? (
           <div className="flex-1 flex flex-col items-center justify-center text-[#94A3B8]">
              <Calendar className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Select a site from the tree to view its planner.</p>
           </div>
        ) : (
          <>
            {/* Header Area */}
            <div className="p-6 border-b border-[#334155] flex items-start justify-between bg-[#1E293B] shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-white font-inter tracking-tight">{siteData?.name}</h1>
                <p className="text-[#94A3B8] text-sm uppercase font-bold tracking-wider mt-1 flex items-center gap-2">
                  12-Month Compliance Planner • {selectedYear}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-9">
                    <Plus className="w-4 h-4 mr-2" /> Add Task
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 font-bold h-9 bg-transparent"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                    Generate Standard Schedule
                  </Button>
                  <Button variant="outline" className="border-[#334155] text-white hover:bg-[#334155] font-bold h-9 bg-transparent">
                    <FileText className="w-4 h-4 mr-2" /> Export PDF
                  </Button>
                </div>
              </div>

              {/* Compliance Score */}
              <div className="flex items-center gap-4 bg-[#0F172A] p-4 rounded-xl border border-[#334155]">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Statutory Compliance</span>
                  <span className="text-xs text-[#94A3B8] mt-1">{totalTasks} Total • {overdueTasks} Overdue</span>
                </div>
                <div className={cn("w-16 h-16 rounded-full border-[4px] flex items-center justify-center font-bold text-xl", scoreColor, scoreBorder)}>
                  {complianceScore}%
                </div>
              </div>
            </div>

            {/* 12-Month Calendar Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              {Object.keys(categoryGroups).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] italic border-2 border-dashed border-[#334155] rounded-lg">
                  <p>No PPM tasks scheduled for {selectedYear}.</p>
                  <p className="text-sm mt-2">Click "Generate Standard Schedule" to build the planner from assets.</p>
                </div>
              ) : (
                <div className="min-w-[1000px]">
                  {/* Grid Header */}
                  <div className="grid grid-cols-12 gap-2 mb-4 sticky top-0 bg-[#0D0D0D] z-10 py-2 border-b-2 border-[#E91E8C]">
                    <div className="col-span-2 text-xs font-bold text-[#E91E8C] uppercase tracking-widest pl-2">Asset Group</div>
                    {monthLabels.map((m, i) => (
                      <div key={m} className="text-center text-xs font-bold text-white uppercase tracking-widest">
                        {m}
                      </div>
                    ))}
                  </div>

                  {/* Category Rows */}
                  {Object.values(categoryGroups).map((group: any) => {
                    const catInfo = getCategoryInfo(group.category);
                    return (
                      <div key={group.category} className="mb-6">
                        <div className="grid grid-cols-12 gap-2 group/row">
                           {/* Row Header Label */}
                           <div className="col-span-2 flex items-start gap-2 pt-2 border-r border-[#334155] pr-2">
                             <catInfo.icon className={cn("w-4 h-4 shrink-0 mt-0.5", catInfo.color)} />
                             <span className="text-xs font-bold text-white leading-tight">{group.category}</span>
                           </div>
                           
                           {/* 12 Month Columns */}
                           {Array.from({ length: 12 }).map((_, monthIdx) => {
                             // Find tasks for this month in this category
                             const monthTasks = group.assets.flatMap((a: any) => a.tasks.filter((t: any) => getMonth(new Date(t.dueDate)) === monthIdx).map((t: any) => ({ ...t, assetName: a.name })));
                             
                             return (
                               <div key={monthIdx} className="min-h-[60px] p-1.5 border border-[#334155]/50 bg-[#1E293B]/30 rounded flex flex-col gap-1.5">
                                 {monthTasks.map((t: any) => {
                                   const overdue = isPast(new Date(t.dueDate)) && t.status !== 'COMPLETED';
                                   return (
                                     <button 
                                       key={t.id} 
                                       onClick={() => setSelectedTask(t)}
                                       className={cn(
                                         "text-left p-1.5 rounded text-[10px] sm:text-[11px] font-medium leading-tight hover:brightness-125 transition-all truncate border",
                                         t.status === 'COMPLETED' ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30" : 
                                         overdue ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30" : 
                                         "bg-[#334155] text-white border-[#475569]"
                                       )}
                                       title={`${t.title} (${t.assetName})`}
                                     >
                                        {t.isStatutory && <span className="font-bold text-[#E91E8C] mr-1">★</span>}
                                        {t.title}
                                     </button>
                                   )
                                 })}
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="bg-[#1E293B] border-[#334155] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-inter tracking-tight flex items-start gap-2">
              {selectedTask?.isStatutory && <ShieldAlert className="w-5 h-5 text-[#E91E8C] shrink-0 mt-0.5" />}
              <div>
                {selectedTask?.title}
                <div className="text-xs text-[#94A3B8] font-normal uppercase mt-1 tracking-wider">
                  {selectedTask?.assetName}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#94A3B8] block mb-1">Status</span> 
                  <Badge className={cn("border-none shrink-0", 
                    selectedTask?.status === 'COMPLETED' ? "bg-[#22C55E] text-white" : "bg-[#F59E0B] text-white"
                  )}>{selectedTask?.status}</Badge>
                </div>
                <div><span className="text-[#94A3B8] block mb-1">Due Date</span> <span className="font-bold">{selectedTask?.dueDate ? format(new Date(selectedTask.dueDate), "dd MMM yyyy") : "—"}</span></div>
                <div><span className="text-[#94A3B8] block mb-1">Frequency</span> <span>{selectedTask?.frequency}</span></div>
                <div><span className="text-[#94A3B8] block mb-1">Standard Reference</span> <span>{selectedTask?.standardRef || "Internal"}</span></div>
             </div>

             {selectedTask?.status !== 'COMPLETED' && (
               <div className="border border-[#334155] rounded-lg p-4 bg-[#0D0D0D] mt-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#94A3B8] mb-3">Completion Log</h4>
                  <div className="space-y-3">
                    <Input type="file" className="bg-[#1E293B] border-[#334155] text-white [color-scheme:dark] h-10 py-1.5" />
                    <Button className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold h-10 border-none shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Completed
                    </Button>
                  </div>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
