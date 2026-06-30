import React from 'react';
import { LayoutDashboard, StickyNotePlus, UsersRound, Archive } from 'lucide-react';

export const navItems = [
  {
    index: 1,
    href: "/dashboard",
    title: "Tableau de Bord",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    index: 2,
    href: "/dashboard/new-leave",
    title: "Nouveau Congé",
    icon: <StickyNotePlus className="w-5 h-5" />,
  },
  {
    index: 3,
    href: "/dashboard/employees",
    title: "Liste des Employés",
    icon: <UsersRound className="w-5 h-5" />,
  },
  {
    index: 4,
    href: "/dashboard/leave-requests",
    title: "pdfs",
    icon: <UsersRound className="w-5 h-5" />,
  },
  {
    index: 5,
    href: "/dashboard/balances",
    title: "edit days",
    icon: <UsersRound className="w-5 h-5" />,
  },
  {
    index: 6,
    href: "/dashboard/reports",
    title: "Archives",
    icon: <Archive className="w-5 h-5" />,
  },
];