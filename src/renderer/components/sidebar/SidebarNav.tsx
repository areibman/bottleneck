import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";
import { cn } from "../../utils/cn";

export interface SidebarNavItem {
  path: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav className="p-4">
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn("sidebar-item", {
                active: isActive,
              })
            }
          >
            <item.icon className="w-4 h-4 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
