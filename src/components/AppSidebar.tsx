import {
  BarChart3,
  Users,
  FileText,
  Zap,
  Calendar,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', icon: BarChart3, sectionId: 'analytics' },
  { title: 'Upcoming', icon: Calendar, sectionId: 'analytics' },
  { title: 'Leads', icon: Users, sectionId: 'leads' },
  { title: 'Templates', icon: FileText, sectionId: 'templates' },
  { title: 'Sequences', icon: Zap, sectionId: 'sequences' },
];

interface AppSidebarProps {
  activeSection?: string;
}

export function AppSidebar({ activeSection }: AppSidebarProps) {
  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => scrollTo(item.sectionId)}
                    isActive={activeSection === item.sectionId}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
