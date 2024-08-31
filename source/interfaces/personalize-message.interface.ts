// Import mongoose module Document & Types
import { Document, Types } from 'mongoose';

// Interface for FAQs
export interface IPersonalizeMessage {

    // Morning message string
    morning_message: string;

    // Afternoon message string
    afternoon_message: string;

    // Evening message string
    evening_message: string;

    // Default message
    is_default?: boolean;

    // ID of the user who created this Personalized Message
    created_by: Types.ObjectId;
}

// Sub-interface of IExchangeRate with Document type

export interface IPersonalizeMessageDocument extends Document, IPersonalizeMessage {}
