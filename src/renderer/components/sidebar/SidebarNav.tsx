import { NavLink, useLocation } from "react-router-dom";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

export interface SidebarNavItem {
  path?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  children?: SidebarNavItem[];
}

interface SidebarNavProps {
  items: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    for (const item of items) {
      if (item.children?.length) {
        initialState[item.label] = false;
      }
    }
    return initialState;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const item of items) {
        if (!item.children?.length) {
          continue;
        }

        if (!(item.label in next)) {
          next[item.label] = false;
          changed = true;
        }

        const hasActiveChild = item.children.some((child) => {
          if (!child.path) {
            return false;
          }
          return location.pathname.startsWith(child.path);
        });

        if (hasActiveChild && !next[item.label]) {
          next[item.label] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [items, location.pathname]);

  const handleToggle = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupActive = (item: SidebarNavItem) =>
    item.children?.some((child) => child.path && location.pathname.startsWith(child.path));

  return (
    <nav className="p-4">
      <div className="space-y-1">
        {items.map((item) => {
          if (item.children?.length) {
            const open = Boolean(openGroups[item.label]);
            const active = isGroupActive(item);

            return (
              <div key={item.label}>
                <div
                  type="div"
                  className={cn(
                    "sidebar-item w-full justify-between border-none bg-transparent focus-visible:outline-none",
                    { active },
                  )}
                  onClick={() => handleToggle(item.label)}
                  aria-expanded={open}
                >
                  <span className="flex items-center flex-1">
                    <item.icon className="w-4 h-4 mr-3 shrink-0" />
                    <span className="text-left">{item.label}</span>
                  </span>
                  {open ? (
                    <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-2 shrink-0" />
                  )}
                </div>

                {open && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path ?? child.label}
                        to={child.path ?? "#"}
                        className={({ isActive }) =>
                          cn("sidebar-item pl-9", {
                            active: isActive,
                          })
                        }
                      >
                        <child.icon className="w-4 h-4 mr-3 shrink-0" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (!item.path) {
            return null;
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn("sidebar-item", {
                  active: isActive,
                })
              }
            >
              <item.icon className="w-4 h-4 mr-3 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
