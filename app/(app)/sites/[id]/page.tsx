'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Building2, MapPin, Search, ArrowLeft, ShieldAlert,
  Loader2, Globe, FileText, Calendar, Compass, Wrench, Package, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

export default function SiteDetailPage() {
  const params = useParams();
  const [site, setSite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  const fetchSite = async () => {
    try {
      const res = await fetch(`/api/sites/${params.id}`);
      if (res.ok) setSite(await res.json());
    } catch (err) {
      console.error('Failed to fetch site:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSite();
  }, [params.id]);

  const handleGeocode = async () => {
    setGeocoding(true);
    try {
      const res = await fetch(`/api/sites/${params.id}/geocode`, { method: 'POST' });
      if (res.ok) {
        fetchSite(); // refresh lat/lng 
      } else {
        alert('Failed to geocode postcode. API may be down or postcode is invalid.');
      }
    } catch (err) {
      alert('Network error geocoding site.');
    } finally {
      setGeocoding(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-[#94A3B8]">
      <Loader2 className="w-8 h-8 animate-spin mr-2 text-[#E91E8C]" /> Loading Site Data...
    </div>
  );

  if (!site) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#94A3B8]">
      <Building2 className="w-12 h-12 text-[#334155] mb-4" />
      <div>Site not found.</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <Link href="/sites" className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors text-sm w-fit font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Sites
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Header */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-inter tracking-tight leading-tight flex items-center gap-3">
              {site.name}
              <Badge className={cn("border-none px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-widest text-[10px]", site.isActive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]")}>
                {site.isActive ? 'Active' : 'Archived'}
              </Badge>
            </h1>
            <p className="text-[#94A3B8] text-sm font-medium mt-1 uppercase tracking-widest">
              Managed for: <Link href={`/clients/${site.clientId}`} className="text-[#3B82F6] hover:underline font-bold">{site.client.name}</Link>
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-white flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#E91E8C] shrink-0 mt-0.5" /> 
                {site.address}
              </p>
              <p className="text-[#94A3B8] flex items-center gap-2 text-sm font-bold uppercase tracking-widest ml-6">
                {site.postcode}
              </p>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Button className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-bold h-9">
              Edit Details
            </Button>
            <Button variant="outline" className="border-[#334155] text-white hover:bg-[#334155] font-bold h-9 bg-transparent">
              <ShieldAlert className="w-4 h-4 mr-2" /> Log H&S Incident
            </Button>
          </div>
        </div>

        {/* Right Map */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[220px]">
           {site.lat && site.lng ? (
              <MiniMap lat={site.lat} lng={site.lng} popupText={site.name} />
           ) : (
              <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center bg-[#0D0D0D] rounded-lg border border-dashed border-[#475569]">
                <Globe className="w-8 h-8 text-[#475569] mb-3" />
                <p className="text-sm font-bold text-[#F59E0B] uppercase tracking-widest mb-1">Not Geocoded</p>
                <p className="text-xs text-[#94A3B8] mb-4">Location mapping disabled.</p>
                <Button 
                   onClick={handleGeocode}
                   disabled={geocoding}
                   className="bg-[#3B82F6] hover:bg-[#2563EB] text-white h-8 text-[11px] font-bold uppercase tracking-wider transition-all"
                >
                  {geocoding ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Compass className="w-3 h-3 mr-2" />}
                  Geocode Address
                </Button>
              </div>
           )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full mt-2">
        <TabsList className="bg-[#1E293B] border border-[#334155] h-12 w-full flex overflow-x-auto justify-start rounded-lg p-1 custom-scrollbar">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0">
             Overview
          </TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Package className="w-4 h-4" /> Assets <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{site.totalAssetsCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Wrench className="w-4 h-4" /> Jobs <Badge className="bg-[#0D0D0D] text-[#94A3B8] border-none ml-1">{site.totalJobsCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ppm" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#E91E8C] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <Calendar className="w-4 h-4" /> PPM Core
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#334155] data-[state=active]:text-white text-[#94A3B8] font-bold tracking-wide rounded-md h-full px-6 shrink-0 flex items-center gap-2">
             <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-[#1E293B] border-[#334155]">
                  <CardContent className="pt-6">
                     <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1">M&E Assets</p>
                     <p className="text-3xl font-bold text-white font-mono">{site.totalAssetsCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1E293B] border-[#334155]">
                  <CardContent className="pt-6">
                     <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Active Jobs</p>
                     <p className="text-3xl font-bold text-[#F59E0B] font-mono">{site.jobs.filter((j: any) => !['COMPLETED', 'CANCELLED', 'INVOICED'].includes(j.status)).length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1E293B] border-[#334155] flex flex-row items-center justify-between">
                  <CardContent className="pt-6">
                     <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Compliance</p>
                     <p className="text-3xl font-bold text-[#E91E8C] font-mono">{site.ppmCompliance}%</p>
                  </CardContent>
                  <div className={cn("w-12 h-12 rounded-full border-[3px] flex items-center justify-center mr-6", site.ppmCompliance > 80 ? "border-[#22C55E]" : site.ppmCompliance > 50 ? "border-[#F59E0B]" : "border-[#EF4444]")} />
                </Card>
             </div>

             <Card className="bg-[#1E293B] border-[#334155] text-white">
                <CardHeader className="border-b border-[#334155]/50 pb-4">
                  <CardTitle className="text-sm uppercase tracking-widest text-[#94A3B8]">Building Intelligence</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-2 gap-y-6">
                   <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1">Site Type</p><p className="font-medium">{site.siteType || "Commercial Office"}</p></div>
                   <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1">Square Footage</p><p className="font-medium font-mono">{site.sqFootage ? site.sqFootage.toLocaleString() : "—"}</p></div>
                   <div><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1">Levels / Floors</p><p className="font-medium">{site.floors || "—"}</p></div>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="ppm">
            <Card className="bg-[#1E293B] border-[#334155] p-10 flex flex-col items-center justify-center text-center">
              <ShieldAlert className="w-16 h-16 text-[#E91E8C] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Statutory Planner</h2>
              <p className="text-[#94A3B8] max-w-md mb-6">
                 Full compliance timelines, 12-month grids, and SFG20 asset mapping have been migrated to the new centralized PPM Engine.
              </p>
              <Link href={`/ppm`}>
                <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold h-10 shadow-lg">
                   Launch PPM Engine <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Rendering {site.totalAssetsCount} assets using the global AssetTable component... (Placeholder)
             </div>
          </TabsContent>
          <TabsContent value="jobs">
             <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-10 text-center text-[#94A3B8] italic text-sm">
               Rendering active jobs trace using the global JobTable component... (Placeholder)
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
