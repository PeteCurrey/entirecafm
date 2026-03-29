'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { JobStatusBadge } from "./JobStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { SLATimer } from "./SLATimer";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Edit2, MoreVertical, Eye } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface JobTableProps {
  data: any[];
}

export function JobTable({ data }: JobTableProps) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "jobNumber",
      header: "Job No",
      cell: ({ row }) => (
        <Link 
          href={`/jobs/${row.original.id}`}
          className="text-[#E91E8C] font-bold hover:underline"
        >
          {row.getValue("jobNumber")}
        </Link>
      ),
    },
    {
      accessorKey: "client.name",
      header: "Client",
    },
    {
      accessorKey: "site.name",
      header: "Site",
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] inline-block">
          {row.getValue("title")}
        </span>
      ),
    },
    {
      accessorKey: "engineer",
      header: "Engineer",
      cell: ({ row }) => {
        const engineer = row.original.engineer;
        if (!engineer) return <span className="text-[#94A3B8] italic">Unassigned</span>;
        
        const initials = engineer.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border-none">
              <AvatarImage src={engineer.avatar} />
              <AvatarFallback className="bg-[#E91E8C] text-white text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] text-white font-medium">{engineer.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <JobStatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded bg-[#111827] text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">
          {row.getValue("type")}
        </span>
      ),
    },
    {
      accessorKey: "slaDeadline",
      header: "SLA",
      cell: ({ row }) => <SLATimer deadline={row.getValue("slaDeadline")} />,
    },
    {
      accessorKey: "scheduledDate",
      header: "Scheduled",
      cell: ({ row }) => {
        const date = row.getValue("scheduledDate");
        return date ? (
          <span className="text-white text-xs">
            {format(new Date(date as string), "dd/MM HH:mm")}
          </span>
        ) : (
          <span className="text-[#94A3B8]">—</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[#94A3B8] hover:text-white transition-colors p-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1E293B] border-[#334155] text-white">
            <DropdownMenuItem className="focus:bg-[#334155] cursor-pointer">
              <Eye className="w-4 h-4 mr-2" />
              View Detail
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#334155] cursor-pointer">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Job
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border border-[#334155] bg-[#1E293B] overflow-hidden">
      <Table>
        <TableHeader className="bg-[#111827]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-[#94A3B8] font-bold text-[11px] uppercase tracking-wider py-4 h-auto">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-[#334155] hover:bg-[#334155]/20 hover:cursor-default"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-4 text-[#F8FAFC]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-[#94A3B8]">
                No jobs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
