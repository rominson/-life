
export interface LifeGoal {
  id: string;
  title: string;
  age: number;
  completed?: boolean;
}

export interface FutureLetter {
  id: string;
  content: string;
  age: number;
  date: Date;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  birthDate?: string;
}

export interface Stats {
  daysLived: number;
  monthsLived: number;
  yearsLived: number;
  percentLived: number;
}

export interface Certificate {
  id: string;
  sender: string;
  departureYear: number;
  arrivalYear: number;
  arrivalAge: number;
  isCenturyTraveler: boolean;
  date: Date;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
