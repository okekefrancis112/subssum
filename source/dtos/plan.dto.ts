import { Types } from "mongoose";
import {
    IPlanDocument,
    IPortfolioIntervals,
    IPortfolioOccurrence,
    IPortfolioCategory,
    IPortfolioStatus,
} from "../interfaces/plan.interface";

export interface CreatePlanDto {
    user_id?: Types.ObjectId;
    goal_name?: string;
    goal_target?: number;
    intervals?: IPortfolioIntervals;
    amount?: number;
    total_amount?: number;
    plan_occurrence: IPortfolioOccurrence;
    duration?: number;
}
