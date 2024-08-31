import { FilterQuery, Types } from "mongoose";
import { ICardsDocument } from "../interfaces/cards.interface";
import { Cards } from "../models";

class CardsRepository {
    // Create bank cards
    public async create({
        user_id,
        platform,
        card_currency,
        authorization_code,
        first6,
        last4,
        exp_month,
        exp_year,
        card_type,
        bank,
    }: {
        user_id: Types.ObjectId;
        platform: string;
        card_currency: string;
        authorization_code?: string;
        first6?: string;
        last4?: string;
        exp_month?: string;
        exp_year?: string;
        card_type?: string;
        bank?: string;
    }): Promise<ICardsDocument | null | any> {
        const data = {
            user_id,
            platform,
            card_currency,
            authorization_code,
            first6,
            last4,
            exp_month,
            exp_year,
            card_type,
            bank,
        };

        return await Cards.create(data);
    }

    // Delete a bank card based on query object parameters passed
    public async deleteOne(
        query: FilterQuery<ICardsDocument>
    ): Promise<ICardsDocument | null> {
        return Cards.findOneAndDelete(query);
    }

    // Get a bank card based on query object parameters passed
    public async getOne(
        query: FilterQuery<ICardsDocument>
    ): Promise<ICardsDocument> {
        return Cards.findOne(query).exec() as Promise<ICardsDocument>;
    }

    // Delete all bank cards based on query object parameters passed
    public async getAll(
        query: FilterQuery<ICardsDocument>
    ): Promise<ICardsDocument | null | any> {
        return Cards.find({ ...query }).sort({ createdAt: -1 });
    }

    // Update a bank card based on query object parameters passed
    public async updateOne(
        query: any,
        record: any
    ): Promise<ICardsDocument | null> {
        return await Cards.findOneAndUpdate(
            { ...query },
            { ...record },
            { new: true }
        );
    }

    // Update all bank cards based on query object parameters passed
    public async updateAll(
        query: any,
        record: any
    ): Promise<ICardsDocument | null | any> {
        return await Cards.updateMany(
            { ...query },
            { ...record },
            { new: true }
        );
    }
}

// Export CardsRepository
export default new CardsRepository();
