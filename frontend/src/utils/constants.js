export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const USER_ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin'
};

export const DEPARTMENTS = [
  { value: 'cse', label: 'Computer Science' },
  { value: 'ece', label: 'Electronics & Communication' },
  { value: 'mech', label: 'Mechanical Engineering' },
  { value: 'civil', label: 'Civil Engineering' },
  { value: 'eee', label: 'Electrical Engineering' }
];

export const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `Semester ${i + 1}`
}));

export const DESIGNATIONS = [
  { value: 'professor', label: 'Professor' },
  { value: 'associate_professor', label: 'Associate Professor' },
  { value: 'assistant_professor', label: 'Assistant Professor' },
  { value: 'lecturer', label: 'Lecturer' }
];