import { Outlet } from 'react-router-dom';
import { useFileWatcher } from '@/hooks/useFileWatcher';
export default function App(){useFileWatcher();return <Outlet />;}
