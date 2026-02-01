'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (searchParams.get('status') === 'connected' && searchParams.get('service') === 'canva') {
      toast({
        title: "Canva Connected!",
        description: "Your account has been successfully linked. You can now use professional autofill.",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome, {session?.user?.name}!</h1>
        <p className="mt-2 text-muted-foreground">
          {isAdmin ? 'Manage your templates and create awesome overlays' : 'Create beautiful overlays with templates'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin ? (
          <>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Template Management</CardTitle>
                <CardDescription>Upload and manage PNG templates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create and organize image templates that users can overlay with their photos.
                </p>
                <Link href="/templates">
                  <Button className="w-full">
                    Manage Templates
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Your template statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Templates</span>
                    <span className="font-semibold">Coming soon</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User Generated Images</span>
                    <span className="font-semibold">Coming soon</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Image Editor</CardTitle>
                <CardDescription>Create overlay with templates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Browse templates and overlay your photos with beautiful designs.
                </p>
                <Link href="/dashboard/editor">
                  <Button className="w-full">
                    Start Editing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Your Gallery</CardTitle>
                <CardDescription>View your created images</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Browse all the images you have created using templates.
                </p>
                <Link href="/dashboard/gallery">
                  <Button className="w-full">
                    View Gallery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="hover:shadow-lg transition-shadow border-blue-100 bg-blue-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="p-1 px-2 rounded bg-blue-600 text-white text-[10px] font-bold uppercase">Canva</span>
              Canva Integration
            </CardTitle>
            <CardDescription>Link your Canva account for professional autofill</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect your Canva account to use official brand templates for high-quality overlays.
            </p>
            <Link href="/api/canva/auth">
              <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                Connect Canva account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
