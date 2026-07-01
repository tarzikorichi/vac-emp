import React from 'react';
import { LayoutDashboard, StickyNotePlus, UsersRound, Archive, FileText, SquareDashedKanban } from 'lucide-react';

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
    title: "Center d'imprision",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    index: 5,
    href: "/dashboard/balances",
    title: "Gestion de congee",
    icon: <SquareDashedKanban className="w-5 h-5" />,
  },
  {
    index: 6,
    href: "/dashboard/Reconnaissance",
    title: "Gestion de Reconnaissance",
    icon: <SquareDashedKanban className="w-5 h-5" />,
  },
  {
    index: 7,
    href: "/dashboard/reports",
    title: "Archives",
    icon: <Archive className="w-5 h-5" />,
  },
];