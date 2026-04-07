import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  FileText,
  Zap,
  Calendar,
  Shield,
  Instagram,
  Star,
  Coffee,
  Building2,
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
import { useUserRole } from '@/hooks/useUserRole';

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
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/influencers')}
                  tooltip="Influencer Discovery"
                >
                  <Star className="h-4 w-4" />
                  <span>Influencers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/cafe-map')}
                  tooltip="Sydney Cafe Map"
                >
                  <Coffee className="h-4 w-4" />
                  <span>Cafe Map</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin')}
                    tooltip="Admin Panel"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/instagram')}
                  tooltip="Instagram Insights"
                >
                  <Instagram className="h-4 w-4" />
                  <span>Instagram</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
