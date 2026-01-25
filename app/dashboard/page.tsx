'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

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
      </div>
    </div>
  );
}
