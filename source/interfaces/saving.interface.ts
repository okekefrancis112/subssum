//Import mongoose and its associated types
import { Types, Document, ObjectId } from 'mongoose';

//Enum for savings occurrence
export enum ISavingsOccurrence {
  RECURRING = 'recurring',
  ONE_TIME_PAYMENT = 'one-time-payment',
}

//Enum for savings type
export enum ISavingsType {
  SINGLE_SAVINGS = 'single-savings',
  SAVINGS_CHALLENGE = 'savings-challenge',
}

//Array of ISavingsType
export const ISavingsTypeList = [ISavingsType.SINGLE_SAVINGS, ISavingsType.SAVINGS_CHALLENGE];

//Array of ISavingsOccurrence
export const ISavingsOccurrenceList = [
  ISavingsOccurrence.RECURRING,
  ISavingsOccurrence.ONE_TIME_PAYMENT,
];

//Interface for savings details
export interface ISavings {
  user_id?: Types.ObjectId;
  plan?: Types.ObjectId;
  challenge?: Types.ObjectId;
  amount?: number;
  savings_type: ISavingsType;
  saving_occurrence: ISavingsOccurrence;
  duration?: number;
  start_date?: Date;
  end_date?: Date;
}

// Interface to save the savings details in MongoDB
export interface ISavingsDocument extends Document, ISavings {}
