'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  siteId: z.string().min(1, 'Site is required'),
  title: z.string().min(3, 'Title is too short'),
  description: z.string().optional(),
  type: z.enum(['REACTIVE', 'PPM', 'INSPECTION', 'QUOTE', 'PROJECT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  engineerId: z.string().optional(),
  slaDeadline: z.string().optional(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

interface NewJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewJobModal({ open, onOpenChange, onSuccess }: NewJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'REACTIVE',
      priority: 'MEDIUM',
    },
  });

  const selectedClientId = form.watch('clientId');

  useEffect(() => {
    // Initial fetch for clients and engineers
    const fetchMetadata = async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/engineers'),
        ]);
        if (cRes.ok) setClients(await cRes.json());
        if (eRes.ok) setEngineers(await eRes.json());
      } catch (err) {
        console.error('Failed to fetch modal metadata:', err);
      }
    };
    if (open) fetchMetadata();
  }, [open]);

  useEffect(() => {
    // Fetch sites for selected client
    const fetchSites = async () => {
      if (!selectedClientId || selectedClientId === 'ALL') return;
      try {
        const res = await fetch(`/api/sites?clientId=${selectedClientId}`);
        if (res.ok) setSites(await res.json());
      } catch (err) {
        console.error('Failed to fetch sites:', err);
      }
    };
    fetchSites();
  }, [selectedClientId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        const newJob = await res.json();
        onSuccess();
        onOpenChange(false);
        form.reset();
      }
    } catch (err) {
      console.error('Failed to create job:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] bg-[#1E293B] border-[#334155] text-white p-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#E91E8C]" />
            Create New Job
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Client Selection */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">Client <span className="text-[#E91E8C]">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D0D0D] border-[#334155]">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Site Selection */}
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">Site <span className="text-[#E91E8C]">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClientId}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D0D0D] border-[#334155]">
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                        {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Job Title <span className="text-[#E91E8C]">*</span></FormLabel>
                  <FormControl>
                    <Input className="bg-[#0D0D0D] border-[#334155]" placeholder="Brief title of the issue" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Description</FormLabel>
                  <FormControl>
                    <Textarea className="bg-[#0D0D0D] border-[#334155] min-h-[100px]" placeholder="Detailed description..." {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">Job Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D0D0D] border-[#334155]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                        <SelectItem value="REACTIVE">REACTIVE</SelectItem>
                        <SelectItem value="PPM">PPM</SelectItem>
                        <SelectItem value="INSPECTION">INSPECTION</SelectItem>
                        <SelectItem value="QUOTE">QUOTE</SelectItem>
                        <SelectItem value="PROJECT">PROJECT</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0D0D0D] border-[#334155]">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                        <SelectItem value="LOW">LOW</SelectItem>
                        <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                        <SelectItem value="HIGH">HIGH</SelectItem>
                        <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* SLA Deadline */}
               <FormField
                control={form.control}
                name="slaDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">SLA Deadline</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-[#0D0D0D] border-[#334155] [color-scheme:dark]" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Scheduled Date */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#94A3B8]">Scheduled Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-[#0D0D0D] border-[#334155] [color-scheme:dark]" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Engineer Assignment */}
            <FormField
              control={form.control}
              name="engineerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#94A3B8]">Assign Engineer</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#0D0D0D] border-[#334155]">
                        <SelectValue placeholder="Select engineer (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1E293B] border-[#334155] text-white">
                      {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-[#334155] text-white hover:bg-[#334155]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-[#E91E8C] hover:bg-[#D41B7F] text-white px-6 shadow-[0_0_15px_rgba(233,30,140,0.2)]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
