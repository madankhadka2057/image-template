'use client';

import { useRouter } from 'next/navigation';
import ImageEditor from '@/components/ImageEditor';

export default function EditorTemplateClient({ template }: { template: any }) {
  const router = useRouter();

  return (
    <ImageEditor
      template={template}
      onClose={() => router.push('/dashboard/editor')}
    />
  );
}
