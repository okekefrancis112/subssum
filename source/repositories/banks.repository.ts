import { Types } from 'mongoose';
import { IBanksDocument } from '../interfaces/banks.interface';
import { Banks } from '../models';
import { CreateBanksDto } from '../dtos/banks.dto';

class BanksRepository {
  // Add Nigerian bank accounts
  public async create({
    country,
    user_id,
    bank_name,
    account_number,
    account_name,
    primary,
  }: CreateBanksDto): Promise<IBanksDocument | null | any> {
    const data = {
      country,
      user_id,
      bank_name,
      account_number,
      account_name,
      primary,
    };

    return await Banks.create(data);
  }

  // Add new foreign bank accounts
  public async createForeign({
    user_id,
    bank_name,
    account_number,
    account_name,
    account_type,
    iban,
    swift_code,
    sort_code,
    wire_routing,
    bank_address,
    primary,
  }: {
    user_id: Types.ObjectId;
    bank_name: string;
    account_number: string;
    account_name: string;
    account_type: string;
    iban?: string;
    swift_code?: string;
    sort_code?: string;
    wire_routing?: string;
    bank_address: string;
    primary: string;
  }): Promise<IBanksDocument | null | any> {
    const data = {
      user_id,
      bank_name,
      account_number,
      account_name,
      account_type,
      iban,
      swift_code,
      sort_code,
      wire_routing,
      bank_address,
      primary,
    };

    return await Banks.create(data);
  }

  // Delete bank account based on query object parameters passed
  public async deleteOne(query: any): Promise<IBanksDocument | null> {
    return Banks.findOneAndDelete({ ...query });
  }

  // Get a bank account based on query object parameters passed
  public async getOne(query: any): Promise<IBanksDocument | null> {
    return Banks.findOne({ ...query });
  }

  // Get all bank accounts based on query object parameters passed
  public async getAll(query: any): Promise<IBanksDocument | null | any> {
    return Banks.find({ ...query }).sort({ createdAt: -1 });
  }

  // Update bank account based on query object parameters passed
  public async updateOne(query: any, record: any): Promise<IBanksDocument | null> {
    return Banks.findOneAndUpdate({ ...query }, { ...record }, { new: true });
  }

  // Update all bank accounts based on query object parameters passed
  public async updateAll(query: any, record: any): Promise<IBanksDocument | null | any> {
    return Banks.updateMany({ ...query }, { ...record }, { new: true });
  }
}

// Export BanksRepository
export default new BanksRepository();
