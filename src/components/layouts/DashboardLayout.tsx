"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/utils/useMobile";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStudentData } from "@/context/StudentContext";
import { toast, useToast } from "@/hooks/utils/useToast";
import { useNotifications } from "@/hooks/utils/useNotification";
import { whatsapp } from "@/shared/utils/functions";
import Logo_White from "../../../public/icons/round_corner_logo.png";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpenText, Lock, ChevronDown, Library, Folder, MessageSquare, ChevronRight, 
  MessageCircle, ChevronUp, Sun, Moon, LogOut, RotateCcw, Home, List, AppWindow, 
  Calendar, Calculator, User, Users, Settings, ListChecks, CalendarDays, Shield, 
  Edit, X, FileSpreadsheet, Building, MoreVertical, Check, Loader2, Clapperboard, 
  CheckCircle2, AlertCircle, Info, Briefcase, GraduationCap, Code2, PanelLeft,
  LayoutGrid, UserCheck, CalendarClock, Fingerprint, Award, TrendingUp, BookOpen, 
  MessageSquareHeart, MoreHorizontal, Download
} from "lucide-react";

const getInitials = (name?: string) => {
  if (!name) return "PT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  shortTitle?: string;
  path: string;
  group?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  opensResourceChooser?: boolean;
  subItems?: Array<{
    title: string;
    path: string;
  }>;
}

const GitHubMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.486 2 12.02c0 4.428 2.865 8.184 6.839 9.51.5.093.682-.217.682-.483 0-.237-.009-.868-.014-1.704-2.782.605-3.369-1.342-3.369-1.342-.455-1.158-1.11-1.467-1.11-1.467-.908-.62.069-.608.069-.608 1.004.071 1.532 1.032 1.532 1.032.892 1.531 2.341 1.089 2.91.833.091-.647.349-1.089.635-1.34-2.22-.253-4.555-1.112-4.555-4.946 0-1.092.39-1.985 1.029-2.685-.103-.253-.446-1.27.098-2.647 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.748-1.026 2.748-1.026.546 1.377.203 2.394.1 2.647.64.7 1.028 1.593 1.028 2.685 0 3.843-2.339 4.69-4.566 4.938.359.31.678.921.678 1.855 0 1.34-.012 2.421-.012 2.75 0 .269.18.581.688.482A10.02 10.02 0 0022 12.02C22 6.486 17.523 2 12 2Z" clipRule="evenodd" />
  </svg>
);

interface HoverMenuProps {
  item: MenuItem;
  isVisible: boolean;
  mouseY: number;
}

interface MobileSubMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
}

const MobileSubMenuDrawer: React.FC<MobileSubMenuDrawerProps> = ({ isOpen, onClose, menuItem }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleSubItemClick = (path: string) => {
    router.push(path);
    onClose();
  };

  React.useEffect(() => {
    if (isOpen && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isOpen]);

  const isActive = (path: string) => pathname === path;

  if (!menuItem) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <menuItem.icon className="h-5 w-5" />
              {menuItem.title}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="p-4">
          {menuItem.subItems ? (
            <div className="space-y-2">
              {menuItem.subItems.map((subItem) => (
                <button
                  key={subItem.path}
                  onClick={() => handleSubItemClick(subItem.path)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${isActive(subItem.path)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-accent hover:bg-accent/80"
                    }`}
                >
                  <div className="font-medium">{subItem.title}</div>
                  {isActive(subItem.path) && (
                    <div className="text-xs opacity-90 mt-1">Current page</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => handleSubItemClick(menuItem.path)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${isActive(menuItem.path)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-accent hover:bg-accent/80"
                }`}
            >
              <div className="font-medium">Open {menuItem.title}</div>
              {isActive(menuItem.path) && (
                <div className="text-xs opacity-90 mt-1">Current page</div>
              )}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
}

const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({ isOpen, onClose, items }) => {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isOpen && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleInstallClick = () => {
    onClose();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("trigger-pwa-install"));
    }
  };

  const isActive = (path: string) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"));

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] p-0 rounded-t-3xl border-t border-border/80">
        <DrawerHeader className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <MoreHorizontal className="h-4 w-4" />
            </div>
            <div className="text-left">
              <DrawerTitle className="text-base font-bold text-foreground font-sans">
                More Features
              </DrawerTitle>
              <p className="text-[11px] text-muted-foreground">Exams, CGPA, Calendar, Classroom & Tools</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto space-y-3 max-h-[70vh]">
          {/* Main more items list */}
          <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
            {items.map((item) => {
              const active = isActive(item.path);
              return (
                <div key={item.path} className="p-1">
                  {item.subItems ? (
                    <div className="p-2 space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-foreground">
                        <item.icon className="h-4 w-4 text-blue-500" />
                        <span>{item.title}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 pl-6">
                        {item.subItems.map((sub) => {
                          const subActive = pathname === sub.path;
                          return (
                            <button
                              key={sub.path}
                              onClick={() => handleNavigate(sub.path)}
                              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                                subActive
                                  ? "bg-blue-600 text-white font-bold"
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span>{sub.title}</span>
                              <ChevronRight className="h-3 w-3 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                        active
                          ? "bg-blue-600 text-white font-bold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-muted-foreground"}`} />
                        <span>{item.title}</span>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 ${active ? "text-white" : "text-muted-foreground"}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick shortcuts */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleNavigate("/profile")}
              className="flex items-center gap-2 p-3 rounded-2xl border border-border/60 bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <User className="h-4 w-4 text-blue-500" />
              <span>Student Profile</span>
            </button>
            <button
              onClick={() => handleNavigate("/settings")}
              className="flex items-center gap-2 p-3 rounded-2xl border border-border/60 bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
            >
              <Settings className="h-4 w-4 text-indigo-500" />
              <span>Settings</span>
            </button>
          </div>

          {/* PWA App Install Action */}
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-between p-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-blue-500" />
              <div>
                <p className="font-bold">Install App to Home Screen</p>
                <p className="text-[10.5px] text-muted-foreground font-normal">Add shortcut for standalone view</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const DashboardContent: React.FC<DashboardLayoutProps> = ({ children }) => {
  const routeRegex = /\/[a-zA-Z0-9\/-]+/g;
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const REFRESH_INTERVAL = 30 * 1000;
  const MOBILE_NAV_SCROLL_KEY = "mobileNavScrollLeft";
  const { logout, isAdmin, accounts, activeAccountId, switchAccount } = useAuth();
  const { profile, fetchFreshData, initiateSession } = useStudentData();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { state } = useSidebar();
  const { settings, updateSettings, profile: lProfile } = useLocalStorageContext();
  const usesDoubleRowMobileNav = settings.mobileNavigationLayout === "double";
  const usesMiniMobileNav = settings.mobileNavigationLayout === "mini";
  const usesSidebarMobileNav = settings.mobileNavigationLayout === "sidebar";
  const usesMobileSideNav = usesSidebarMobileNav;

  const notifications = useNotifications();
  const { toasts, dismiss } = useToast();
  const activeMobileToast = isMobile ? toasts.find((t) => (t as any).open !== false) : null;

  useEffect(() => {
    if (isMobile && activeMobileToast && activeMobileToast.id) {
      const timer = setTimeout(() => {
        dismiss(activeMobileToast.id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, activeMobileToast?.id, activeMobileToast?.open, dismiss]);

  const isCollapsed = state === "collapsed";
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFetchingNewData, setIsFetchingNewData] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    setImgError(false);
  }, [profile?.picture]);
  const [showTutorial, setShowTutorial] = useState(false);
  const lastRefreshRef = React.useRef<number>(0);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("expandedMenus");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedMobileNav, setSelectedMobileNav] = useState<string | null>(null);
  const [mobileSubMenuDrawer, setMobileSubMenuDrawer] = useState<{
    isOpen: boolean;
    menuItem: MenuItem | null;
  }>({
    isOpen: false,
    menuItem: null
  });
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const mobileNavScrollRef = React.useRef<HTMLDivElement | null>(null);
  const notificationPanelRef = React.useRef<HTMLDivElement | null>(null);

  const isActive = (path: string) => pathname === path;
  const isSubPathActive = (basePath: string) => {
    if (pathname === basePath) return true;
    if (basePath === "/admin" || basePath === "/dashboard") {
      return pathname === basePath;
    }
    return pathname.startsWith(basePath + "/");
  };

  const handleRefresh = () => fetchFreshData();
  const handleHomeNavigation = () => router.push("/dashboard");
  const handleAccountSwitch = (accountId: string) => {
    switchAccount(accountId);
  };

  const openMobileSubMenu = (menuItem: MenuItem) => {
    setMobileSubMenuDrawer({ isOpen: true, menuItem });
  };

  const closeMobileSubMenu = () => {
    setMobileSubMenuDrawer({ isOpen: false, menuItem: null });
  };

  const renderNotification = (text: string) => {
    let elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches = [...text.matchAll(mdLinkRegex)];

    matches.forEach((match, i) => {
      const [fullMatch, linkText, url] = match;
      const matchStart = match.index!;
      const matchEnd = matchStart + fullMatch.length;
      const beforeText = text.slice(lastIndex, matchStart);
      elements.push(...processRoutes(beforeText));
      elements.push(
        <a
          key={`md-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
          data-notif-ignore="true"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {linkText}
        </a>
      );
      lastIndex = matchEnd;
    });
    elements.push(...processRoutes(text.slice(lastIndex)));
    return elements;
  };

  const processRoutes = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const matches = [...text.matchAll(routeRegex)];

    matches.forEach((match, i) => {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIndex) {
        parts.push(text.slice(lastIndex, matchStart));
      }

      const fullRoute = match[0];
      const displayText = fullRoute.split("/").filter(Boolean).pop();

      parts.push(
        <span
          key={`route-${i}-${fullRoute}`}
          data-notif-ignore="true"
          onClick={(e) => {
            e.stopPropagation();
            router.push(fullRoute);
          }}
          className="text-blue-500 underline cursor-pointer"
        >
          {displayText}
        </span>
      );

      lastIndex = matchEnd;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const handleNotificationBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest &&
      (target.closest('a') ||
        target.closest('button') ||
        target.closest('[data-notif-ignore]'))
    ) {
      return;
    }
    setIsNotificationsOpen((prev) => !prev);
    const now = Date.now();
    if (now - lastRefreshRef.current >= REFRESH_INTERVAL) {
      notifications.refresh();
      lastRefreshRef.current = now;
    }
  };

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const closeNotificationsOnOutsidePress = (event: PointerEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeNotificationsOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeNotificationsOnOutsidePress);
  }, [isNotificationsOpen]);

  const toggleSubMenu = (key: string) => {
    if (!isCollapsed) {
      setExpandedMenus((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const clearHoverTimeout = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const setDelayedHoverTimeout = (callback: () => void, delay: number = 150) => {
    const timeout = setTimeout(callback, delay);
    setHoverTimeout(timeout);
  };

  const HoverMenu: React.FC<HoverMenuProps> = ({ item, isVisible, mouseY }) => {
    if (!isVisible) return null;
    return (
      <div
        className="fixed bg-popover border border-border rounded-md shadow-xl z-[9999] min-w-40 py-2"
        style={{
          left: "50px",
          top: `${mouseY - 20}px`,
        }}
        onMouseEnter={() => {
          clearHoverTimeout();
          setHoveredItem(item.path);
        }}
        onMouseLeave={() => {
          setDelayedHoverTimeout(() => {
            setHoveredItem(null);
          });
        }}
      >
        <div className="px-3 py-2 text-sm font-medium text-foreground border-b border-border">
          {item.title}
        </div>

        {item.subItems ? (
          item.subItems.map((subItem) => (
            <button
              key={subItem.path}
              onClick={() => {
                router.push(subItem.path);
                setHoveredItem(null);
                clearHoverTimeout();
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 ${isActive(subItem.path)
                ? "bg-accent text-accent-foreground dark:text-accent-foreground text-black"
                : "hover:bg-accent/50 text-foreground"
                }`}
            >
              {subItem.title}
            </button>
          ))
        ) : (
          <button
            onClick={() => {
              router.push(item.path);
              setHoveredItem(null);
              clearHoverTimeout();
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 ${isActive(item.path)
              ? "bg-accent text-accent-foreground dark:text-accent-foreground text-black"
              : "hover:bg-accent/50 text-foreground"
              }`}
          >
            Open {item.title}
          </button>
        )}
      </div>
    );
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setDelayedHoverTimeout(() => {
        setHoveredItem(null);
      });
    }
  };

  const handleMouseEnter = (item: MenuItem, e: React.MouseEvent) => {
    if (isCollapsed) {
      clearHoverTimeout();
      setHoveredItem(item.path);
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseEnterNotifications = () => {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  };

  const handleMouseLeaveNotifications = () => {
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "0";
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.subItems) {
      if (isCollapsed || isMobile) {
        openMobileSubMenu(item);
      } else {
        toggleSubMenu(item.path);
      }
    } else {
      router.push(item.path);
      setHoveredItem(null);
      clearHoverTimeout();
    }
  };

  useEffect(() => {
    setShowTutorial(!settings.sidebarTutorialDone);
  }, [settings.sidebarTutorialDone]);

  const handleSidebarClick = () => {
    updateSettings({ sidebarTutorialDone: true })
    setShowTutorial(false);
  }

  const handleMobileNavClick = (item: MenuItem) => {
    setSelectedMobileNav(item.path);
    if (item.subItems) {
      openMobileSubMenu(item);
    } else {
      router.push(item.path);
    }
  };

  const handleMobileNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    try {
      localStorage.setItem(MOBILE_NAV_SCROLL_KEY, String(e.currentTarget.scrollLeft));
    } catch (error) { }
  };

  useEffect(() => {
    const baseMenu: MenuItem[] = [
      { title: "Dashboard", shortTitle: "Home", path: "/dashboard", icon: LayoutGrid },
      { title: "Attendance Details", shortTitle: "Attendance", path: "/attendance", icon: UserCheck },
      { title: "Time Table", shortTitle: "Timetable", path: "/timetable", icon: CalendarClock },
      { title: "Capture Attendance", shortTitle: "Capture", path: "/markattendance", icon: Fingerprint },
      {
        title: "Exams",
        shortTitle: "Exam",
        path: "/exams",
        icon: Award,
        subItems: [
          { title: "Internals", path: "/exams/internals" },
          { title: "Past Internals", path: "/exams/past-internals" },
          { title: "Semester Results", path: "/exams/semester-results" },
        ],
      },
      { title: "Cgpa Calculator", shortTitle: "CGPA", path: "/cgpa", icon: TrendingUp },
      { title: "Academic Calender", shortTitle: "Calendar", path: "/calender", icon: CalendarDays },
      { title: "Google Classroom", shortTitle: "Class", path: "/classroom", icon: BookOpen },
      { title: "Feedback", shortTitle: "Feed", path: "/feedback", icon: MessageSquareHeart },
    ];

    let menu = [...baseMenu];
    if (isAdmin) {
      menu.push(
        {
          title: "Admin Panel",
          shortTitle: "Admin",
          path: "/admin",
          icon: Shield,
        }
      );
    }
    setMenuItems(menu);
  }, [isAdmin]);

  useEffect(() => {
    setHoveredItem(null);
    clearHoverTimeout();
    setSelectedMobileNav(pathname);
  }, [pathname]);

  useEffect(() => {
    document.title = "Student Corner - SRM AP";
  }, [router, pathname, profile?.studentName]);

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  useEffect(() => {
    if (isMobile) {
      localStorage.setItem("sidebarState", "expanded");
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    try {
      const savedScroll = localStorage.getItem(MOBILE_NAV_SCROLL_KEY);
      if (!savedScroll) return;
      const scrollLeft = Number(savedScroll);
      if (Number.isNaN(scrollLeft)) return;

      requestAnimationFrame(() => {
        if (mobileNavScrollRef.current) {
          mobileNavScrollRef.current.scrollLeft = scrollLeft;
        }
      });
    } catch (error) { }
  }, [isMobile, menuItems.length]);

  // 🚀 Auto-scroll floating mobile dock to keep active item centered
  useEffect(() => {
    if (!isMobile || !mobileNavScrollRef.current) return;
    const timer = setTimeout(() => {
      const activeEl = mobileNavScrollRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname, isMobile, menuItems]);

  useEffect(() => {
    localStorage.setItem("sidebarState", state);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem("expandedMenus", JSON.stringify(expandedMenus));
    } catch (error) { }
  }, [expandedMenus]);

  return (
    <div className="min-h-screen flex w-full bg-transparent relative">
      <Sidebar className="border-r-0 shadow-2xl glass-panel" style={{ backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }} collapsible="icon">
        <SidebarContent className="bg-transparent">
            {!isCollapsed && (
              <div className="p-4 relative border-b border-white/[0.08] dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-blue-500/30 shadow-lg shrink-0 bg-white/5 flex items-center justify-center">
                    <Image
                      src={!imgError && profile?.picture ? profile.picture : Logo_White}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate font-mono">{profile?.registerNo}</p>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile?.studentName}</p>
                  </div>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="py-3 px-2 border-b border-white/[0.08] dark:border-white/[0.06] flex justify-center">
                <div className="w-9 h-9 rounded-2xl overflow-hidden ring-2 ring-blue-500/30 shadow-md bg-white/5">
                  <Image
                    src={!imgError && profile?.picture ? profile.picture : Logo_White}
                    alt="Profile"
                    width={36}
                    height={36}
                    unoptimized
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <SidebarGroup className="flex-1">
              {!isCollapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className={`space-y-0.5 ${isCollapsed ? "items-center px-1" : "px-2"}`}>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      {isCollapsed ? (
                        <div className="relative">
                          <SidebarMenuButton
                            onMouseEnter={(e) => handleMouseEnter(item, e)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleMenuClick(item)}
                            className={`group transition-all duration-200 cursor-pointer relative w-10 h-10 p-0 flex items-center justify-center rounded-xl ${isSubPathActive(item.path) ? "bg-gradient-to-tr from-blue-500/25 to-sky-400/20 text-foreground ring-1 ring-sky-400/30 shadow-md shadow-blue-500/10" : "hover:bg-white/10 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground"}`}
                          >
                            <item.icon className="h-4 w-4" />

                            {item.highlight && (
                              <span className="absolute top-2 right-2 flex items-center justify-center">
                                <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-blue-600 opacity-75"></span>
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                              </span>
                            )}

                            {isSubPathActive(item.path) && (
                              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-sky-400 rounded-l-sm" />
                            )}
                          </SidebarMenuButton>
                          <HoverMenu
                            item={item}
                            isVisible={hoveredItem === item.path}
                            mouseY={mousePosition.y}
                          />
                        </div>
                      ) : (
                        <>
                          <SidebarMenuButton
                            onClick={() => handleMenuClick(item)}
                            hasSubItems={!!item.subItems}
                            className={`group transition-all duration-150 cursor-pointer relative rounded-xl ${isSubPathActive(item.path) ? "bg-gradient-to-r from-blue-500/20 via-sky-500/15 to-transparent text-foreground font-semibold border-l-2 border-sky-400 shadow-sm" : "hover:bg-white/[0.08] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground"} ${isMobile ? "text-sm py-2" : "py-2.5"}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <item.icon
                                  className={`mr-3 h-5 w-5 transition-colors ${isMobile ? "h-4 w-4 mr-2" : ""
                                    }`}
                                />
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{item.title}</span>
                                </div>
                              </div>

                              {item.highlight && (
                                <span className="absolute top-2 right-2 flex items-center justify-center">
                                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-sky-400 opacity-75"></span>
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500"></span>
                                </span>
                              )}

                              {item.subItems && (
                                <>
                                  {expandedMenus[item.path] ? (
                                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                                  )}
                                </>
                              )}
                            </div>
                            {isActive(item.path) && !item.subItems && (
                              <div className="absolute right-0 top-0 bottom-0 w-1 bg-sidebar-accent-foreground rounded-l-full" />
                            )}
                          </SidebarMenuButton>
                          {item.subItems && expandedMenus[item.path] && (
                            <SidebarMenuSub className="mt-1 ml-4 border-l border-sidebar-border/30">
                              {item.subItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.path}>
                                  <SidebarMenuSubButton
                                    onClick={() => router.push(subItem.path)}
                                    isActive={isActive(subItem.path)}
                                    className={`transition-all duration-150 cursor-pointer pl-4 ${isActive(subItem.path)
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-sidebar-accent-foreground"
                                      : "hover:bg-sidebar-accent/30"
                                      } ${isMobile ? "text-xs py-1.5" : "py-2"}`}
                                  >
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">{subItem.title}</span>
                                    </div>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className={`border-t border-white/[0.07] ${isCollapsed ? 'py-4 px-2' : 'p-4'}`}>
              {!isCollapsed ? (
                <>
                  <div className="mb-4 space-y-2">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => router.push("/terms")}
                        className={`text-left ${isMobile ? 'text-xs' : 'text-sm'} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:underline transition-colors duration-200`}
                      >
                        Terms and Conditions
                      </button>
                      <button
                        onClick={() => router.push("/privacy")}
                        className={`text-left ${isMobile ? 'text-xs' : 'text-sm'} text-sidebar-foreground/70 hover:text-sidebar-foreground hover:underline transition-colors duration-200`}
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 border-0"
                    onClick={() => logout()}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 hover:bg-accent hover:text-accent-foreground transition-all duration-200 rounded-md"
                    onClick={() => router.push("/terms")}
                    title="Terms and Conditions"
                  >
                    <BookOpenText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 hover:bg-accent hover:text-accent-foreground transition-all duration-200 rounded-md"
                    onClick={() => router.push("/privacy")}
                    title="Privacy Policy"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-transparent border-sidebar-border hover:bg-destructive hover:text-red-600 hover:border-destructive transition-all duration-200 rounded-md"
                    onClick={() => logout()}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </SidebarContent>
        </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden relative">
        {lProfile?.hasCachedData && (
          <div className="w-full bg-red-500 text-white text-center text-xs sm:text-sm py-2 px-4 font-medium z-30 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shrink-0">
            <span>Showing cached data from {lProfile.sessionTime} since college portal is down. Click below button if portal was up again!</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs bg-transparent border-white text-white hover:bg-white hover:text-red-500" 
              disabled={isFetchingNewData}
              onClick={async () => {
                setIsFetchingNewData(true);
                try {
                  const res = await initiateSession();
                  if (res) {
                    toast({ title: "Success", description: `New data fetched for session: ${res.sessionTime}` });
                  } else {
                    toast({ variant: "destructive", title: "Error", description: "SRM portal is still unreachable." });
                  }
                } finally {
                  setIsFetchingNewData(false);
                }
              }}
            >
              {isFetchingNewData && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              {isFetchingNewData ? "Fetching..." : "Fetch new data"}
            </Button>
          </div>
        )}
        <header
          style={{
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
          className={`sticky top-0 z-40 h-16 w-full px-4 sm:px-6 md:px-8 flex items-center border-b border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#090d16]/75 backdrop-blur-2xl backdrop-saturate-200 shadow-sm transition-all duration-300 transform-gpu shrink-0 ${isMobile && activeMobileToast ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
            <div className="flex items-center justify-between h-full w-full">
              {/* Left: Sidebar Toggle + Brand Emblem + Current Page (SkillWallet Style) */}
              <div className="flex items-center gap-3 min-w-0">
                {!isMobile && (
                  <div className="relative shrink-0 hidden md:block">
                    <SidebarTrigger
                      className="hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors h-9 w-9 cursor-pointer"
                      onClick={handleSidebarClick}
                    />
                    {showTutorial && (
                      <div className="absolute left-full -ml-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center z-50">
                        👈 Click here to open the menu
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brand Emblem & Name */}
                <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
                  <Image
                    src={Logo_White}
                    alt="Portal Emblem"
                    className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                    priority
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 leading-none">
                      <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground font-sans">
                        SRMAP <span className="text-blue-600 dark:text-blue-400 font-black">PORTAL</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium tracking-wide mt-1 hidden sm:inline">
                      Student Cockpit
                    </span>
                  </div>
                </Link>

                {/* Active Page Indicator Pill */}
                <div className="hidden md:flex items-center">
                  <span className="text-muted-foreground/30 mx-2 font-light">/</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {(() => {
                      for (const item of menuItems) {
                        if (item.subItems) {
                          const subItemMatch = item.subItems.find((subItem) =>
                            isActive(subItem.path)
                          );
                          if (subItemMatch) return subItemMatch.title;
                        }
                      }
                      const exactMatch = menuItems.find((item) => isActive(item.path));
                      if (exactMatch) return exactMatch.title;
                      const subPathMatch = menuItems.find((item) =>
                        pathname.startsWith(item.path + '/') && item.path !== '/dashboard'
                      );
                      if (subPathMatch) return subPathMatch.title;
                      return "Dashboard";
                    })()}
                  </span>
                </div>
              </div>

                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {/* Direct 1-Click Theme Switcher */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="rounded-xl h-8 w-8 hover:bg-white/10 dark:hover:bg-white/5 border border-white/10"
                    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                  >
                    {theme === "light" ? (
                      <Moon className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-400" />
                    )}
                  </Button>

                  {/* Direct 1-Click Reload Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    className="rounded-xl h-8 w-8 hover:bg-white/10 dark:hover:bg-white/5 border border-white/10 hidden sm:inline-flex"
                    aria-label="Reload portal data"
                    title="Reload data"
                  >
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  </Button>

                  {/* Account Switcher Avatar */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-9 w-9 p-0 overflow-hidden hover:opacity-90 ring-2 ring-emerald-500/30 hover:ring-emerald-400 transition-all duration-200"
                        aria-label="Switch account"
                      >
                        {!imgError && profile?.picture ? (
                          <Image
                            src={profile.picture}
                            alt="Profile"
                            width={36}
                            height={36}
                            unoptimized
                            onError={() => setImgError(true)}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {getInitials(profile?.studentName)}
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 glass-panel rounded-2xl p-1.5 shadow-2xl border border-white/20 dark:border-white/10">
                      {/* User Header */}
                      <div className="px-3 py-2.5 border-b border-border/50 mb-1">
                        <p className="text-sm font-bold text-foreground truncate font-sans">
                          {profile?.studentName || "Student"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {profile?.registerNo || "SRMAP Portal"}
                        </p>
                      </div>

                      {/* Primary Navigation to Profile & Settings */}
                      <DropdownMenuItem
                        className="cursor-pointer rounded-xl py-2 px-3 gap-2.5 text-xs font-medium"
                        onClick={() => router.push("/profile")}
                      >
                        <User className="h-4 w-4 text-blue-500" />
                        <span>Student Profile</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="cursor-pointer rounded-xl py-2 px-3 gap-2.5 text-xs font-medium"
                        onClick={() => router.push("/settings")}
                      >
                        <Settings className="h-4 w-4 text-indigo-500" />
                        <span>Portal Settings</span>
                      </DropdownMenuItem>

                      {/* Quick Theme Switch */}
                      <DropdownMenuItem
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className="cursor-pointer rounded-xl py-2 px-3 gap-2.5 text-xs font-medium"
                      >
                        {theme === "light" ? (
                          <Moon className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-400" />
                        )}
                        <span>{theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}</span>
                      </DropdownMenuItem>

                      {/* Account Switcher Section (if multiple accounts) */}
                      {(accounts?.length || 0) > 1 && (
                        <>
                          <DropdownMenuSeparator className="my-1 border-border/40" />
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-mono">
                            Switch Account
                          </DropdownMenuLabel>
                          {accounts.map((account) => {
                            const isActiveAccount = account.id === activeAccountId;
                            return (
                              <DropdownMenuItem
                                key={account.id}
                                onClick={() => {
                                  if (!isActiveAccount) handleAccountSwitch(account.id);
                                }}
                                className="cursor-pointer rounded-xl py-1.5 px-3 flex items-center justify-between text-xs"
                              >
                                <span className="font-mono">{account.username}</span>
                                {isActiveAccount && <Check className="h-3.5 w-3.5 text-blue-500" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </>
                      )}

                      <DropdownMenuSeparator className="my-1 border-border/40" />

                      {/* Sign Out */}
                      <DropdownMenuItem
                        onClick={() => logout()}
                        className="cursor-pointer rounded-xl py-2 px-3 gap-2.5 text-xs font-semibold text-red-600 dark:text-red-400 focus:text-red-500 focus:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {notifications.notifications.length > 0 && (
              <div ref={notificationPanelRef} className="relative mt-2 px-4 sm:px-6 md:px-8">
                <div
                  onClick={handleNotificationBarClick}
                  className={`notifications-bar cursor-pointer glass-card text-foreground py-2 px-4 flex items-center justify-between rounded-xl shadow-sm border border-white/20 dark:border-white/10 ${isMobile && usesMobileSideNav ? "ml-12" : ""}`}
                >
                  <span className="font-medium text-sm truncate">
                    {renderNotification(notifications.notifications[0].notification)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 shrink-0 ml-2 ${isNotificationsOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {isNotificationsOpen && (
                  <div
                    className={`notifications-bar absolute right-0 top-full mt-2 z-50 glass-panel rounded-2xl p-2 shadow-2xl ${isMobile && usesMobileSideNav ? "left-12" : "left-0"}`}
                    onMouseEnter={handleMouseEnterNotifications}
                    onMouseLeave={handleMouseLeaveNotifications}
                  >
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {notifications.notifications.slice(1).map((note, index) => (
                        <div key={index} className="p-2.5 rounded-xl bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 border border-white/10 text-sm cursor-pointer transition-all duration-200">
                          {renderNotification(note.notification)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

        <main className={`flex-1 min-w-0 p-4 sm:p-6 ${isMobile && usesMobileSideNav ? "pl-14" : ""} ${isMobile && !usesMobileSideNav && !usesMiniMobileNav ? "pb-24 sm:pb-28" : "pb-12"}`}>
          {children}
        </main>

        {isMobile && (
          <>
            {usesMiniMobileNav ? (
              <>
                <MiniMobileNav items={menuItems.slice(0, Math.ceil(menuItems.length / 2))} side="left" selectedPath={selectedMobileNav} isSubPathActive={isSubPathActive} onClick={handleMobileNavClick} />
                <MiniMobileNav items={menuItems.slice(Math.ceil(menuItems.length / 2))} side="right" selectedPath={selectedMobileNav} isSubPathActive={isSubPathActive} onClick={handleMobileNavClick} />
              </>
            ) : usesSidebarMobileNav ? (
              <MobileSidebarNav items={menuItems} selectedPath={selectedMobileNav} isSubPathActive={isSubPathActive} onClick={handleMobileNavClick} />
            ) : (() => {
              const primaryMobilePaths = ["/dashboard", "/attendance", "/markattendance", "/timetable"];
              const primaryMobileItems = [
                menuItems.find((m) => m.path === "/dashboard"),
                menuItems.find((m) => m.path === "/attendance"),
                menuItems.find((m) => m.path === "/markattendance"),
                menuItems.find((m) => m.path === "/timetable"),
              ].filter(Boolean) as MenuItem[];

              const moreMobileItems = menuItems.filter(
                (m) => !primaryMobilePaths.includes(m.path)
              );
              const isMoreActive = isMoreDrawerOpen || moreMobileItems.some((m) => isSubPathActive(m.path));

              return (
                <>
                  <div 
                    style={{
                      backdropFilter: "blur(24px) saturate(190%)",
                      WebkitBackdropFilter: "blur(24px) saturate(190%)",
                    }}
                    className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 w-[92vw] sm:w-auto sm:max-w-md z-40 h-[3.4rem] rounded-full liquid-dock glass-dock shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] overflow-hidden border border-white/60 dark:border-white/15 select-none transition-all duration-300 transform-gpu"
                  >
                    <div className="flex h-full items-center justify-around w-full px-2 sm:px-4">
                      {primaryMobileItems.map((item) => {
                        const active = selectedMobileNav === item.path || isSubPathActive(item.path);
                        return (
                          <button
                            key={item.path}
                            data-active={active ? "true" : undefined}
                            onClick={(e) => {
                              (e.currentTarget as HTMLElement)?.blur();
                              handleMobileNavClick(item);
                            }}
                            className="group relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-95 select-none cursor-pointer"
                          >
                            {/* 🔵 Circular icon highlight when active */}
                            <div
                              className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 ${
                                active
                                  ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 text-white scale-105"
                                  : "text-slate-600 dark:text-slate-300 group-hover:bg-black/5 dark:group-hover:bg-white/10"
                              }`}
                            >
                              <item.icon
                                className={`h-4 w-4 transition-transform ${
                                  active ? "stroke-[2.1]" : "stroke-[1.7]"
                                }`}
                              />
                            </div>

                            {/* Label */}
                            <span
                              className={`text-[9.5px] leading-none mt-1 truncate max-w-[58px] text-center transition-colors ${
                                active
                                  ? "text-blue-600 dark:text-blue-400 font-bold"
                                  : "text-slate-500 dark:text-slate-400 font-medium"
                              }`}
                            >
                              {item.shortTitle ?? item.title}
                            </span>
                          </button>
                        );
                      })}

                      {/* 5th Button: More */}
                      <button
                        data-active={isMoreActive ? "true" : undefined}
                        onClick={(e) => {
                          (e.currentTarget as HTMLElement)?.blur();
                          setIsMoreDrawerOpen(true);
                        }}
                        className="group relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-95 select-none cursor-pointer"
                      >
                        <div
                          className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 ${
                            isMoreActive
                              ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 text-white scale-105"
                              : "text-slate-600 dark:text-slate-300 group-hover:bg-black/5 dark:group-hover:bg-white/10"
                          }`}
                        >
                          <MoreHorizontal
                            className={`h-4 w-4 transition-transform ${
                              isMoreActive ? "stroke-[2.1]" : "stroke-[1.7]"
                            }`}
                          />
                        </div>

                        <span
                          className={`text-[9.5px] leading-none mt-1 truncate max-w-[58px] text-center transition-colors ${
                            isMoreActive
                              ? "text-blue-600 dark:text-blue-400 font-bold"
                              : "text-slate-500 dark:text-slate-400 font-medium"
                          }`}
                        >
                          More
                        </span>
                      </button>
                    </div>
                  </div>

                  <MobileMoreDrawer
                    isOpen={isMoreDrawerOpen}
                    onClose={() => setIsMoreDrawerOpen(false)}
                    items={moreMobileItems}
                  />
                </>
              );
            })()}

            <MobileSubMenuDrawer
              isOpen={mobileSubMenuDrawer.isOpen}
              onClose={closeMobileSubMenu}
              menuItem={mobileSubMenuDrawer.menuItem}
            />
          </>
        )}
      </div>
    </div>
  );
};

function MiniMobileNav({
  items,
  side,
  selectedPath,
  isSubPathActive,
  onClick,
}: {
  items: MenuItem[];
  side: "left" | "right";
  selectedPath: string | null;
  isSubPathActive: (path: string) => boolean;
  onClick: (item: MenuItem) => void;
}) {
  const edgeClass = side === "left" ? "left-0 rounded-r-md border-r" : "right-0 rounded-l-md border-l";

  return (
    <nav className={`fixed ${edgeClass} top-1/2 z-30 -translate-y-1/2 border-y border-border bg-background/95 py-1 shadow-sm backdrop-blur-sm`} aria-label={`${side} mobile navigation`}>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = selectedPath === item.path || isSubPathActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              title={item.title}
              aria-label={item.title}
              onClick={() => onClick(item)}
              className={`relative flex h-7 w-7 items-center justify-center transition-colors ${active ? "bg-primary/15 text-primary" : "text-foreground/65 hover:bg-accent hover:text-foreground"}`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.highlight && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-blue-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobileSidebarNav({
  items,
  selectedPath,
  isSubPathActive,
  onClick,
}: {
  items: MenuItem[];
  selectedPath: string | null;
  isSubPathActive: (path: string) => boolean;
  onClick: (item: MenuItem) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 top-16 z-50 w-12 overflow-y-auto border-r border-border bg-background/95 py-2 shadow-sm backdrop-blur-sm no-scrollbar" aria-label="Mobile sidebar navigation">
      <div className="flex flex-col items-center gap-1.5">
        {items.map((item) => {
          const active = selectedPath === item.path || isSubPathActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              title={item.title}
              aria-label={item.title}
              onClick={() => onClick(item)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${active ? "bg-primary/15 text-primary" : "text-foreground/65 hover:bg-accent hover:text-foreground"}`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.highlight && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
};

export default DashboardLayout;
