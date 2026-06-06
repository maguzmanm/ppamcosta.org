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
  user?: { id: string; email: string; role: string };
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
  createdBy?: { id: string; publisher: { firstName: string; lastName: string } };
  assignments?: ShiftAssignment[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  publisherId: string;
  status: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO';
  assignedAt: string;
  respondedAt?: string;
  publisher: { id: string; firstName: string; lastName: string; phone?: string; congregation?: { name: string } };
  shift?: {
    location: {
      id: string; name: string; address?: string;
      locationAssignments?: {
        roleAtLocation: string;
        user?: { publisher: { firstName: string; lastName: string; phone?: string } };
      }[];
    };
    date: string;
    timeSlot: TimeSlot;
  };
}

export interface Circuit {
  id: string;
  name: string;
  _count?: { congregations: number };
}

export interface Congregation {
  id: string;
  name: string;
  circuitId: string;
  circuit?: Circuit;
  _count?: { publishers: number };
}

export interface News {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  author?: { publisher: { firstName: string; lastName: string } };
}

export interface Experience {
  id: string;
  publisherId: string;
  title: string;
  content: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  reviewNotes?: string;
  createdAt: string;
  publisher: { id: string; firstName: string; lastName: string; congregation?: { name: string } };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
}
