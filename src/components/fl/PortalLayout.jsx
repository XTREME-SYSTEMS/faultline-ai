import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function PortalLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}