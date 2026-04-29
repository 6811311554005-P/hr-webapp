/**
 * Employee domain types
 */

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  birthDate?: string;
}

export interface EmployeeData {
  sequence: number | string;
  orderNumber: string;
  name: string;
  position: string;
  location: string;
  salary: number | string;
  duration: string;
  startDate: string;
  workAge: string;
  resignationDate: string;
  budget: number | string;
  birthDate?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface EducationRecord {
  yearFrom: string;
  yearTo: string;
  institution: string;
  degree: string;
}

export interface EmployeeProfile {
  name: string;
  nickname: string;
  birthDate: string;
  age: number;
  maritalStatus: string;
  idNumber: string;
  idIssuedDate: string;
  idExpiryDate: string;
  religion: string;
  nationality: string;
  ethnicity: string;
  phone: string;
  lineId: string;
  email: string;
  address: string;
  province: string;
  currentPosition: string;
  currentLocation: string;
  startDate: string;
  resignationDate: string;
  emergencyContacts: EmergencyContact[];
  educationHistory: EducationRecord[];
}
