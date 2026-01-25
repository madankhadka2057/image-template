'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Edit3, ImageIcon } from 'lucide-react';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'user'],
  },
  {
    label: 'Templates',
    href: '/templates',
    icon: Edit3,
    roles: ['admin'],
  },
  {
    label: 'Editor',
    href: '/editor',
    icon: Edit3,
    roles: ['user'],
  },
  {
    label: 'Gallery',
    href: '/gallery',
    icon: ImageIcon,
    roles: ['user'],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userRole = (session?.user as any)?.role || 'user';

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card text-card-foreground">
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-bold text-primary">ImageFrame</h1>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {userRole}
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full bg-transparent"
          onClick={() => signOut({ redirect: true, callbackUrl: '/auth/login' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
