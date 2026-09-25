import type { ReactNode } from 'react';
/** Workspace content is self-contained, so standalone and nested route mounts share the same behavior. */
export default function WorkspaceShell({children}:{children:ReactNode}) {return <div className="mx-auto max-w-7xl space-y-7 text-stone-900">{children}</div>;}
