export type UserRole =
  | 'COORDINADOR'
  | 'AUXILIAR'
  | 'ENCARGADO_PUNTO'
  | 'AUXILIAR_PUNTO'
  | 'ENCARGADO_EXPERIENCIAS'
  | 'PUBLICADOR';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  publisherId: string;
  publisherName: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

export interface Publisher {
  id: string;
  firstName: string;
  lastName: string;
  marriedLastName?: string;
  designations?: string;
  gender?: string;
  congregationId: string;
  congregation?: { id: string; name: string; circuit?: { id: string; name: string } };
  phone?: string;
  email?: string;
  isActive: boolean;
  notes?: string;
  user?: { id: string; email: string; role: UserRole };
}

export interface Availability {
  id: string;
  publisherId: string;
  dayOfWeek: number;
  timeSlotId: string;
  timeSlot: TimeSlot;
}

export interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isActive: boolean;
  locationAssignments?: LocationAssignment[];
}

export interface LocationAssignment {
  id: string;
  userId: string;
  locationId: string;
  roleAtLocation: 'ENCARGADO_PUNTO' | 'AUXILIAR_PUNTO';
  user?: { publisher: { firstName: string; lastName: string } };
}

export interface Shift {
  id: string;
  locationId: string;
  location: { id: string; name: string; address?: string };
  date: string;
  timeSlotId: string;
  timeSlot: TimeSlot;
  maxPublishers: number;
  status: 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  notes?: string;
  createdBy?: { publisher: { firstName: string; lastName: string } };
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  publisherId: string;
  status: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO';
  assignedAt: string;
  respondedAt?: string;
  publisher: { firstName: string; lastName: string; marriedLastName?: string };
}

export interface Circuit {
  id: string;
  name: string;
  congregations?: Congregation[];
}

export interface Congregation {
  id: string;
  name: string;
  circuitId: string;
  circuit?: Circuit;
  _count?: { publishers: number };
}

export interface Experience {
  id: string;
  publisherId: string;
  publisher: { firstName: string; lastName: string; marriedLastName?: string };
  title: string;
  content: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { publisher: { firstName: string; lastName: string } };
  publishedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  readAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalPublishers: number;
  activeShifts: number;
  pendingExperiences: number;
  totalLocations: number;
  shiftsByMonth: { month: string; count: number }[];
  experiencesByStatus: { status: string; count: number }[];
}
