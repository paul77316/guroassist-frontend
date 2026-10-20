import { NavLink } from 'react-router-dom';

const tabCls = ({ isActive }) =>
  `border-b-2 px-3 py-2 text-sm font-medium ${
    isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;

export default function AttendanceTabs() {
  return (
    <div className="mt-4 flex gap-2 border-b border-gray-200">
      <NavLink to="/attendance" end className={tabCls}>Take attendance</NavLink>
      <NavLink to="/attendance/report" className={tabCls}>Report</NavLink>
    </div>
  );
}