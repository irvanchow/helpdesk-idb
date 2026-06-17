"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Users,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  BookOpen,
  Building2,
  MessageCircle,
  Crown,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const navigation = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Asisten", href: "/chat", icon: MessageCircle, beta: true },
    { name: "Semua Tiket", href: "/tickets", icon: Ticket },
    { name: "Buat Tiket", href: "/tickets/new", icon: PlusCircle },
    { name: "Knowledge Base", href: "/kb", icon: BookOpen },
    { name: "KB Admin", href: "/admin/kb", icon: BookOpen },
    { name: "Manajemen User", href: "/admin/users", icon: Users },
    { name: "Kategori", href: "/admin/categories", icon: Settings },
    { name: "Laporan", href: "/admin/reports", icon: BarChart3 },
  ],
  USER: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Asisten", href: "/chat", icon: MessageCircle, beta: true },
    { name: "Tiket Saya", href: "/tickets", icon: Ticket },
    { name: "Buat Tiket", href: "/tickets/new", icon: PlusCircle },
    { name: "Knowledge Base", href: "/kb", icon: BookOpen },
  ],
  AGENT: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Asisten", href: "/chat", icon: MessageCircle, beta: true },
    { name: "Tiket Divisi", href: "/technician/tickets", icon: Shield },
    { name: "Tiket Saya", href: "/tickets", icon: Ticket },
    { name: "Buat Tiket", href: "/tickets/new", icon: PlusCircle },
    { name: "Knowledge Base", href: "/kb", icon: BookOpen },
  ],
  SUPERVISOR: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Asisten", href: "/chat", icon: MessageCircle, beta: true },
    { name: "Tiket Divisi", href: "/department/tickets", icon: Building2 },
    { name: "Tiket Saya", href: "/tickets", icon: Ticket },
    { name: "Buat Tiket", href: "/tickets/new", icon: PlusCircle },
    { name: "Knowledge Base", href: "/kb", icon: BookOpen },
  ],
  EXECUTIVE: [
    { name: "Dashboard", href: "/executive/dashboard", icon: Crown },
    { name: "Monitor Tiket", href: "/executive/tickets", icon: Ticket },
    { name: "Laporan", href: "/executive/reports", icon: BarChart3 },
  ],
};

type NavItem = { name: string; href: string; icon: React.ElementType; beta?: boolean };

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role as keyof typeof navigation) || "USER";
  const items = (navigation[role] || navigation.USER) as NavItem[];

  return (
    <div className="flex h-full flex-col border-r border-[#E2E8F0] bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E2E8F0] overflow-hidden">
          <Image
            src="/logo.png"
            alt="IDB Bali Logo"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
        </div>
        <div>
          <h1 className="text-[15px] font-bold leading-tight text-[#1E293B] tracking-tight">
            IDB Bali
          </h1>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F97316]">
            Helpdesk
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "bg-[#F1F5F9] text-[#94A3B8] group-hover:bg-white group-hover:text-[#64748B] group-hover:shadow-sm"
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className="flex items-start gap-1">
                {item.name}
                {item.beta && (
                  <sup className="text-[9px] font-bold text-red-500 leading-none mt-0.5">Beta</sup>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="mb-3 rounded-xl bg-[#F8FAFC] p-3.5 border border-[#E2E8F0]">
          <p className="text-[13px] font-semibold text-[#1E293B]">
            {session?.user?.name}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
            {session?.user?.email}
          </p>
          <span className="inline-flex mt-2 items-center rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2563EB]">
            {role === "EXECUTIVE" ? (
              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                <Crown className="h-3 w-3" />
                Eksekutif
              </span>
            ) : role === "SUPERVISOR" ? (
              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <Building2 className="h-3 w-3" />
                Supervisor
              </span>
            ) : role === "AGENT" ? (
              <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <Shield className="h-3 w-3" />
                Agent
              </span>
            ) : (
              <span>{role}</span>
            )}
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start h-9 text-[13px] border-[#E2E8F0] text-[#64748B] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
