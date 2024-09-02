import { Types } from "mongoose";
import {
    IPaymentDocument,
    IPaymentIntervals,
    IPaymentOccurrence,
    IPaymentCategory,
    IPaymentStatus,
} from "../interfaces/payment.interface";

export interface CreatepaymentDto {
    user_id?: Types.ObjectId;
    goal_name?: string;
    goal_target?: number;
    intervals?: IPaymentIntervals;
    amount?: number;
    total_amount?: number;
    payment_occurrence: IPaymentOccurrence;
    duration?: number;
}
